"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { requireApprovedMember } from "@/lib/group-access";
import { effectiveUnitPrice, type TierTerms } from "@/lib/pricing";
import { createNotification } from "@/lib/notifications";
import { logListingChanges, type ListingChangeInput } from "@/lib/listing-log";
import { acceptOffer, rejectOffer } from "@/lib/offers";
import { assertWithinBalanceLimit } from "@/lib/balance-limit";

export type ListingState = { error?: string } | undefined;

function fmtMoney(n: number | null | undefined) {
  return n != null ? `${n.toFixed(2)} ₺` : "—";
}

function fmtDate(d: Date | null | undefined) {
  return d ? d.toLocaleDateString("tr-TR") : "—";
}

function sameDate(a: Date | null | undefined, b: Date | null | undefined) {
  return (a?.getTime() ?? null) === (b?.getTime() ?? null);
}

function describeTerms(l: {
  totalStock: number | null;
  dealBonusQuantity: number | null;
  ekstraIskontoYuzde: number | null;
  ekstraIndirim: number | null;
}) {
  const parts: string[] = [];
  if (l.totalStock != null && l.dealBonusQuantity && l.dealBonusQuantity > 0 && l.dealBonusQuantity < l.totalStock) {
    parts.push(`${l.totalStock - l.dealBonusQuantity}+${l.dealBonusQuantity} MF`);
  } else {
    parts.push("MF yok");
  }
  if (l.ekstraIskontoYuzde) parts.push(`%${l.ekstraIskontoYuzde} iskonto`);
  if (l.ekstraIndirim) parts.push(`${l.ekstraIndirim.toFixed(2)} ₺ indirim`);
  return parts.join(" · ");
}

function describeLimits(l: { minAlim: number | null; maxAlim: number | null; alimKatlari: number | null }) {
  return `min ${l.minAlim ?? "—"} · maks ${l.maxAlim ?? "—"}${l.alimKatlari ? ` · ${l.alimKatlari}'in katları` : ""}`;
}

function describeTiers(tiers: TierTerms[]) {
  if (tiers.length === 0) return "Kademe yok";
  return tiers
    .map((t) => {
      const extra = [t.iskontoYuzde ? `%${t.iskontoYuzde}` : "", t.iskontoTL ? `${t.iskontoTL} ₺` : ""]
        .filter(Boolean)
        .join(" ");
      return `${t.alimMiktari}+${t.mfMiktari}${extra ? ` (${extra})` : ""}`;
    })
    .join(", ");
}

const MAX_TIERS = 6;

/** Formdaki "tiers" JSON alanını doğrulayıp kademe listesine çevirir. */
function parseTiers(raw: FormDataEntryValue | null): { tiers: TierTerms[] } | { error: string } {
  const text = String(raw ?? "").trim();
  if (!text) return { tiers: [] };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: "Kademe bilgileri okunamadı." };
  }
  if (!Array.isArray(data)) return { error: "Kademe bilgileri okunamadı." };

  const tiers: TierTerms[] = [];
  for (const item of data.slice(0, MAX_TIERS)) {
    const t = (item ?? {}) as Record<string, unknown>;
    const alim = Math.round(Number(t.alimMiktari));
    const mf = Math.round(Number(t.mfMiktari ?? 0));
    const iy = t.iskontoYuzde == null ? null : Number(t.iskontoYuzde);
    const itl = t.iskontoTL == null ? null : Number(t.iskontoTL);
    if (!Number.isFinite(alim) || alim <= 0) return { error: "Kademe alım miktarı 1 veya daha büyük olmalı." };
    if (!Number.isFinite(mf) || mf < 0) return { error: "Kademe MF adedi negatif olamaz." };
    if (iy != null && (!Number.isFinite(iy) || iy < 0 || iy > 100)) {
      return { error: "Kademe iskonto yüzdesi 0-100 arasında olmalı." };
    }
    if (itl != null && (!Number.isFinite(itl) || itl < 0)) return { error: "Kademe iskonto tutarı negatif olamaz." };
    tiers.push({ alimMiktari: alim, mfMiktari: mf, iskontoYuzde: iy || null, iskontoTL: itl || null });
  }
  tiers.sort((a, b) => a.alimMiktari + a.mfMiktari - (b.alimMiktari + b.mfMiktari));
  return { tiers };
}

function parseKdv(value: FormDataEntryValue | null) {
  const n = numberOrNull(value);
  if (n == null) return 10;
  return n >= 0 && n <= 100 ? n : null;
}

function describeDates(l: { startDate: Date | null; endDate: Date | null }) {
  return `${fmtDate(l.startDate)} – ${fmtDate(l.endDate)}`;
}

function numberOrNull(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function dateOrNull(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  return s ? new Date(s) : null;
}

export async function createListingAction(
  _prevState: ListingState,
  formData: FormData
): Promise<ListingState> {
  const user = await requireUser();

  const groupId = String(formData.get("groupId") ?? "").trim();
  if (!groupId) return { error: "Grup seçimi gerekli." };
  await requireApprovedMember(groupId, user);

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group || group.closedAt) {
    return { error: "Bu grup kapatıldığı için yeni ilan verilemiyor." };
  }

  const targetMode = String(formData.get("targetMode") ?? "GROUP");
  let targetUserId: string | null = null;
  if (targetMode === "PHARMACY") {
    targetUserId = String(formData.get("targetUserId") ?? "").trim() || null;
    if (!targetUserId) return { error: "Eczaneye özel ilan için bir eczane seçin." };
    const targetMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });
    if (!targetMembership || targetMembership.status !== "APPROVED" || targetUserId === user.id) {
      return { error: "Seçilen eczane bu grupta onaylı üye değil." };
    }
  }

  const medicineName = String(formData.get("medicineName") ?? "").trim().toLocaleUpperCase("tr-TR");
  const barkod = String(formData.get("barkod") ?? "").trim();
  const quantity = String(formData.get("quantity") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!medicineName) return { error: "İlaç adı gerekli." };

  const birimFiyat = numberOrNull(formData.get("birimFiyat"));
  if (birimFiyat === null || birimFiyat <= 0) {
    return { error: "Geçerli bir depo (birim) fiyatı girin." };
  }

  const totalStock = numberOrNull(formData.get("totalStock"));
  if (totalStock === null || totalStock <= 0) {
    return { error: "Toplam stok (adet) girmeniz gerekiyor." };
  }
  const dealBonusQuantity = numberOrNull(formData.get("dealBonusQuantity"));
  if (dealBonusQuantity != null && dealBonusQuantity >= totalStock) {
    return { error: "Mal fazlası, toplam stoktan küçük olmalı." };
  }
  const ekstraIndirim = numberOrNull(formData.get("ekstraIndirim"));
  if (ekstraIndirim != null && ekstraIndirim < 0) {
    return { error: "Ekstra indirim negatif olamaz." };
  }
  const ekstraIskontoYuzde = numberOrNull(formData.get("ekstraIskontoYuzde"));
  if (ekstraIskontoYuzde != null && (ekstraIskontoYuzde < 0 || ekstraIskontoYuzde > 100)) {
    return { error: "Ekstra iskonto yüzdesi 0-100 arasında olmalı." };
  }

  const listingKind = String(formData.get("listingKind") ?? "STOK") === "DEPO_OZEL_SART" ? "DEPO_OZEL_SART" : "STOK";
  const allowExceedDemand = listingKind === "DEPO_OZEL_SART" && formData.get("allowExceedDemand") === "on";

  const isBakiyeTransferi = medicineName === "BAKİYE TRANSFERİ";
  const expiryDate = dateOrNull(formData.get("expiryDate"));
  if (listingKind === "STOK" && !isBakiyeTransferi && !expiryDate) {
    return { error: "Stoğumdaki ürün için son kullanma tarihi (SKT) girmeniz gerekiyor." };
  }

  const kdvOrani = parseKdv(formData.get("kdvOrani"));
  if (kdvOrani == null) return { error: "KDV oranı 0-100 arasında olmalı." };
  const alimKatlari = numberOrNull(formData.get("alimKatlari"));
  if (alimKatlari != null && (alimKatlari < 1 || !Number.isInteger(alimKatlari))) {
    return { error: "Alım katları 1 veya daha büyük bir tam sayı olmalı." };
  }
  const parsedTiers = listingKind === "DEPO_OZEL_SART" ? parseTiers(formData.get("tiers")) : { tiers: [] };
  if ("error" in parsedTiers) return { error: parsedTiers.error };

  await prisma.listing.create({
    data: {
      groupId,
      userId: user.id,
      title: medicineName,
      medicineName,
      barkod: barkod || null,
      quantity: quantity || null,
      description: description || null,
      totalStock,
      birimFiyat,
      dealBonusQuantity,
      ekstraIndirim,
      ekstraIskontoYuzde,
      etiketFiyati: numberOrNull(formData.get("etiketFiyati")),
      startDate: dateOrNull(formData.get("startDate")),
      endDate: dateOrNull(formData.get("endDate")),
      hedefAlim: numberOrNull(formData.get("hedefAlim")),
      maxAlim: numberOrNull(formData.get("maxAlim")),
      minAlim: numberOrNull(formData.get("minAlim")),
      alimKatlari,
      kdvOrani,
      expiryDate,
      listingKind,
      allowExceedDemand,
      targetUserId,
      tiers: parsedTiers.tiers.length
        ? { create: parsedTiers.tiers.map((t, i) => ({ ...t, sortOrder: i })) }
        : undefined,
    },
  });

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

export async function updateListingAction(
  groupId: string,
  listingId: string,
  _prevState: ListingState,
  formData: FormData
): Promise<ListingState> {
  const user = await requireUser();

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      offers: {
        where: { status: { in: ["PENDING", "ACCEPTED"] } },
        include: { shipment: true },
      },
      tiers: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!listing || listing.groupId !== groupId || listing.userId !== user.id) {
    return { error: "Bu ilana ait değilsiniz." };
  }

  const kdvOrani = parseKdv(formData.get("kdvOrani"));
  if (kdvOrani == null) return { error: "KDV oranı 0-100 arasında olmalı." };
  const alimKatlari = numberOrNull(formData.get("alimKatlari"));
  if (alimKatlari != null && (alimKatlari < 1 || !Number.isInteger(alimKatlari))) {
    return { error: "Alım katları 1 veya daha büyük bir tam sayı olmalı." };
  }
  const editTiers = listing.listingKind === "DEPO_OZEL_SART" && formData.has("tiers");
  const parsedTiers = editTiers ? parseTiers(formData.get("tiers")) : { tiers: [] };
  if ("error" in parsedTiers) return { error: parsedTiers.error };

  const medicineName = String(formData.get("medicineName") ?? "").trim().toLocaleUpperCase("tr-TR");
  const barkod = String(formData.get("barkod") ?? "").trim();
  const quantity = String(formData.get("quantity") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!medicineName) return { error: "İlaç adı gerekli." };

  const hasShippedOffers = listing.offers.some((o) => o.shipment != null);

  const data: Parameters<typeof prisma.listing.update>[0]["data"] = {
    title: medicineName,
    medicineName,
    barkod: barkod || null,
    quantity: quantity || null,
    description: description || null,
    etiketFiyati: numberOrNull(formData.get("etiketFiyati")),
    startDate: dateOrNull(formData.get("startDate")),
    endDate: dateOrNull(formData.get("endDate")),
    maxAlim: numberOrNull(formData.get("maxAlim")),
    minAlim: numberOrNull(formData.get("minAlim")),
    alimKatlari,
    kdvOrani,
    expiryDate: dateOrNull(formData.get("expiryDate")),
  };

  const oldNetFiyat = effectiveUnitPrice(listing);

  if (!hasShippedOffers) {
    const birimFiyat = numberOrNull(formData.get("birimFiyat"));
    if (birimFiyat === null || birimFiyat <= 0) {
      return { error: "Geçerli bir depo (birim) fiyatı girin." };
    }
    const totalStock = numberOrNull(formData.get("totalStock"));
    if (totalStock === null || totalStock <= 0) {
      return { error: "Toplam stok (adet) girmeniz gerekiyor." };
    }
    const dealBonusQuantity = numberOrNull(formData.get("dealBonusQuantity"));
    if (dealBonusQuantity != null && dealBonusQuantity >= totalStock) {
      return { error: "Mal fazlası, toplam stoktan küçük olmalı." };
    }
    const ekstraIndirim = numberOrNull(formData.get("ekstraIndirim"));
    if (ekstraIndirim != null && ekstraIndirim < 0) {
      return { error: "Ekstra indirim negatif olamaz." };
    }
    const ekstraIskontoYuzde = numberOrNull(formData.get("ekstraIskontoYuzde"));
    if (ekstraIskontoYuzde != null && (ekstraIskontoYuzde < 0 || ekstraIskontoYuzde > 100)) {
      return { error: "Ekstra iskonto yüzdesi 0-100 arasında olmalı." };
    }
    data.birimFiyat = birimFiyat;
    data.totalStock = totalStock;
    data.dealBonusQuantity = dealBonusQuantity;
    data.ekstraIndirim = ekstraIndirim;
    data.ekstraIskontoYuzde = ekstraIskontoYuzde;
  }

  const next = {
    medicineName,
    barkod: barkod || null,
    quantity: quantity || null,
    description: description || null,
    etiketFiyati: data.etiketFiyati as number | null,
    startDate: data.startDate as Date | null,
    endDate: data.endDate as Date | null,
    minAlim: data.minAlim as number | null,
    maxAlim: data.maxAlim as number | null,
    alimKatlari,
    expiryDate: data.expiryDate as Date | null,
    birimFiyat: hasShippedOffers ? listing.birimFiyat : (data.birimFiyat as number | null),
    totalStock: hasShippedOffers ? listing.totalStock : (data.totalStock as number | null),
    dealBonusQuantity: hasShippedOffers ? listing.dealBonusQuantity : (data.dealBonusQuantity as number | null),
    ekstraIndirim: hasShippedOffers ? listing.ekstraIndirim : (data.ekstraIndirim as number | null),
    ekstraIskontoYuzde: hasShippedOffers ? listing.ekstraIskontoYuzde : (data.ekstraIskontoYuzde as number | null),
  };

  const newNetFiyat = effectiveUnitPrice(next);

  // Stok artırılıp satılan miktarın üstüne çıkarsa ilan tekrar hedefe
  // açılır; stok satılan miktara inerse hedefe ulaşmış sayılır.
  if (!hasShippedOffers && next.totalStock != null && listing.listingKind === "STOK") {
    const soldQty = listing.offers
      .filter((o) => o.status === "ACCEPTED")
      .reduce((sum, o) => sum + o.quantity, 0);
    if (next.totalStock > soldQty && listing.targetReachedAt) data.targetReachedAt = null;
    if (next.totalStock <= soldQty && !listing.targetReachedAt && soldQty > 0) data.targetReachedAt = new Date();
  }

  const changes: ListingChangeInput[] = [];
  if (next.birimFiyat !== listing.birimFiyat) {
    changes.push({ type: "DEPO_FIYATI", oldValue: fmtMoney(listing.birimFiyat), newValue: fmtMoney(next.birimFiyat) });
  }
  if (next.totalStock !== listing.totalStock) {
    changes.push({
      type: "STOK",
      oldValue: listing.totalStock != null ? `${listing.totalStock} adet` : "—",
      newValue: next.totalStock != null ? `${next.totalStock} adet` : "—",
    });
  }
  const oldTerms = describeTerms(listing);
  const newTerms = describeTerms(next);
  if (oldTerms !== newTerms) {
    changes.push({ type: "SART", oldValue: oldTerms, newValue: newTerms });
  }
  if (!sameDate(listing.expiryDate, next.expiryDate)) {
    changes.push({ type: "SKT", oldValue: fmtDate(listing.expiryDate), newValue: fmtDate(next.expiryDate) });
  }
  if (listing.minAlim !== next.minAlim || listing.maxAlim !== next.maxAlim || listing.alimKatlari !== next.alimKatlari) {
    changes.push({ type: "ALIM_LIMITI", oldValue: describeLimits(listing), newValue: describeLimits(next) });
  }
  if (!sameDate(listing.startDate, next.startDate) || !sameDate(listing.endDate, next.endDate)) {
    changes.push({ type: "TARIH", oldValue: describeDates(listing), newValue: describeDates(next) });
  }
  if ((listing.description ?? null) !== next.description) {
    changes.push({ type: "ACIKLAMA", oldValue: listing.description, newValue: next.description });
  }
  const otherDiffs: string[] = [];
  if (listing.medicineName !== next.medicineName) otherDiffs.push(`İlaç adı: ${listing.medicineName} → ${next.medicineName}`);
  if ((listing.barkod ?? null) !== next.barkod) otherDiffs.push(`Barkod: ${listing.barkod ?? "—"} → ${next.barkod ?? "—"}`);
  if ((listing.quantity ?? null) !== next.quantity) otherDiffs.push(`Miktar açıklaması: ${listing.quantity ?? "—"} → ${next.quantity ?? "—"}`);
  if (listing.etiketFiyati !== next.etiketFiyati) {
    otherDiffs.push(`Etiket fiyatı: ${fmtMoney(listing.etiketFiyati)} → ${fmtMoney(next.etiketFiyati)}`);
  }
  if (listing.kdvOrani !== kdvOrani) otherDiffs.push(`KDV oranı: %${listing.kdvOrani} → %${kdvOrani}`);
  if (editTiers) {
    const oldTiers = describeTiers(listing.tiers);
    const newTiers = describeTiers(parsedTiers.tiers);
    if (oldTiers !== newTiers) changes.push({ type: "SART", oldValue: `Kademeler: ${oldTiers}`, newValue: `Kademeler: ${newTiers}` });
  }
  if (otherDiffs.length > 0) {
    changes.push({ type: "DIGER", oldValue: null, newValue: otherDiffs.join("\n") });
  }
  if (oldNetFiyat != null && newNetFiyat != null && Math.abs(oldNetFiyat - newNetFiyat) > 0.001) {
    const priceChange = changes.find((c) => c.type === "DEPO_FIYATI" || c.type === "SART" || c.type === "STOK");
    if (priceChange) {
      priceChange.newValue = `${priceChange.newValue} (net fiyat ${fmtMoney(oldNetFiyat)} → ${fmtMoney(newNetFiyat)})`;
    }
  }

  const changeNote = String(formData.get("changeNote") ?? "").trim();

  await prisma.listing.update({ where: { id: listingId }, data });
  if (editTiers) {
    await prisma.$transaction([
      prisma.listingTier.deleteMany({ where: { listingId } }),
      prisma.listingTier.createMany({
        data: parsedTiers.tiers.map((t, i) => ({ ...t, listingId, sortOrder: i })),
      }),
    ]);
  }
  await logListingChanges(listing, user.id, changes, changeNote);

  if (!hasShippedOffers && oldNetFiyat != null && newNetFiyat != null && Math.abs(oldNetFiyat - newNetFiyat) > 0.001) {
    await Promise.all(
      listing.offers.map((offer) => {
        if (offer.status === "PENDING") {
          return createNotification({
            userId: offer.userId,
            message: `"${listing.title}" ilanının şartları değişti: önceki fiyatınız ${oldNetFiyat.toFixed(2)} ₺, yeni fiyat ${newNetFiyat.toFixed(2)} ₺. Teklifinizi gözden geçirin.`,
            link: `/groups/${groupId}/listings/${listingId}`,
          });
        }
        return createNotification({
          userId: offer.userId,
          message: `"${listing.title}" ilanının şartları değişti (yeni fiyat: ${newNetFiyat.toFixed(2)} ₺). Kabul ettiğiniz teklif fiyatınız ${oldNetFiyat.toFixed(2)} ₺ olarak sabit kalır.`,
          link: `/groups/${groupId}/listings/${listingId}`,
        });
      })
    );
  }

  revalidatePath(`/groups/${groupId}/listings/${listingId}`);
  redirect(`/groups/${groupId}/listings/${listingId}`);
}

export async function closeListingAction(groupId: string, listingId: string) {
  const user = await requireUser();

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.groupId !== groupId || listing.userId !== user.id) {
    throw new Error("Bu ilana ait değilsiniz.");
  }

  await prisma.listing.update({ where: { id: listingId }, data: { status: "CLOSED" } });
  await logListingChanges(listing, user.id, [
    { type: "DURUM", oldValue: LISTING_STATUS_TR[listing.status], newValue: "Kapandı" },
  ]);

  revalidatePath(`/groups/${groupId}/listings/${listingId}`);
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/listings");
}

const LISTING_STATUS_TR: Record<string, string> = {
  OPEN: "Açık",
  MATCHED: "Eşleşti",
  CLOSED: "Kapandı",
  PASSIVE: "Pasif",
};

/** İlanı geçici olarak yayından kaldırır; grup üyeleri göremez ve teklif veremez. */
export async function pauseListingAction(groupId: string, listingId: string) {
  const user = await requireUser();

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.groupId !== groupId || listing.userId !== user.id) {
    throw new Error("Bu ilana ait değilsiniz.");
  }
  if (listing.status !== "OPEN") {
    throw new Error("Sadece yayındaki bir ilan pasife çekilebilir.");
  }

  await prisma.listing.update({ where: { id: listingId }, data: { status: "PASSIVE" } });
  await logListingChanges(listing, user.id, [{ type: "DURUM", oldValue: "Açık", newValue: "Pasif" }]);

  revalidatePath(`/groups/${groupId}/listings/${listingId}`);
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/listings");
}

/** Sahibinin kendi ilanını "Aynı Şartlarda Yeni İlan" formuna şablon olarak getirir. */
export async function listingTemplateAction(listingId: string) {
  const user = await requireUser();

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { tiers: { orderBy: { sortOrder: "asc" } } },
  });
  if (!listing || listing.userId !== user.id) return null;

  return {
    kdvOrani: listing.kdvOrani,
    alimKatlari: listing.alimKatlari,
    tiers: listing.tiers.map((t) => ({
      alimMiktari: t.alimMiktari,
      mfMiktari: t.mfMiktari,
      iskontoYuzde: t.iskontoYuzde,
      iskontoTL: t.iskontoTL,
    })),
    groupId: listing.groupId,
    medicineName: listing.medicineName,
    barkod: listing.barkod,
    quantity: listing.quantity,
    description: listing.description,
    birimFiyat: listing.birimFiyat,
    totalStock: listing.totalStock,
    dealBonusQuantity: listing.dealBonusQuantity,
    ekstraIndirim: listing.ekstraIndirim,
    ekstraIskontoYuzde: listing.ekstraIskontoYuzde,
    etiketFiyati: listing.etiketFiyati,
    expiryDate: listing.expiryDate,
    minAlim: listing.minAlim,
    maxAlim: listing.maxAlim,
    listingKind: listing.listingKind,
    allowExceedDemand: listing.allowExceedDemand,
  };
}

function checkStockCap(
  listing: { totalStock: number | null; listingKind: string; allowExceedDemand: boolean },
  offers: { quantity: number; status: string }[],
  quantity: number
) {
  if (listing.totalStock == null) return;
  if (listing.listingKind === "DEPO_OZEL_SART") {
    if (listing.allowExceedDemand) return;
    const totalDemand = offers
      .filter((o) => o.status !== "REJECTED")
      .reduce((sum, o) => sum + o.quantity, 0);
    const remaining = listing.totalStock - totalDemand;
    if (quantity > remaining) {
      throw new Error(`Toplam talep sınırına ulaşıldı. Kalan talep hakkı: ${Math.max(0, remaining)} adet.`);
    }
  } else {
    const soldQty = offers.filter((o) => o.status === "ACCEPTED").reduce((sum, o) => sum + o.quantity, 0);
    const remaining = listing.totalStock - soldQty;
    if (quantity > remaining) {
      throw new Error(`Stokta sadece ${remaining} adet kaldı.`);
    }
  }
}

export async function createOfferAction(
  groupId: string,
  listingId: string,
  formData: FormData
) {
  const user = await requireUser();
  await requireApprovedMember(groupId, user);

  const message = String(formData.get("message") ?? "").trim();
  const quantity = Math.max(1, Math.round(numberOrNull(formData.get("quantity")) ?? 1));

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { offers: { where: { status: { in: ["PENDING", "ACCEPTED"] } }, select: { quantity: true, status: true } } },
  });
  if (!listing || listing.groupId !== groupId) {
    throw new Error("İlan bulunamadı.");
  }
  if (listing.status !== "OPEN") {
    throw new Error("Bu ilan şu anda teklif kabul etmiyor.");
  }
  if (listing.minAlim && quantity < listing.minAlim) {
    throw new Error(`Minimum alım miktarı ${listing.minAlim}.`);
  }
  if (listing.maxAlim && quantity > listing.maxAlim) {
    throw new Error(`Maksimum alım miktarı ${listing.maxAlim}.`);
  }
  if (listing.alimKatlari && quantity % listing.alimKatlari !== 0) {
    throw new Error(`Alım miktarı ${listing.alimKatlari} adedin katları olmalı.`);
  }
  checkStockCap(listing, listing.offers, quantity);

  const unitPrice = effectiveUnitPrice(listing) ?? 0;
  const totalPrice = unitPrice * quantity;
  await assertWithinBalanceLimit({ groupId, userId: user.id, amount: totalPrice });

  await prisma.offer.create({
    data: {
      listingId,
      userId: user.id,
      message: message || null,
      quantity,
      unitPrice,
      totalPrice,
    },
  });

  await createNotification({
    userId: listing.userId,
    message: `${user.pharmacyName ?? user.contactName} eczanesi "${listing.title}" ilanınızdan ${quantity} adet almak istiyor.`,
    link: `/groups/${groupId}/listings/${listingId}`,
  });

  revalidatePath(`/groups/${groupId}/listings/${listingId}`);
}

export async function updateOfferAction(
  groupId: string,
  listingId: string,
  offerId: string,
  formData: FormData
) {
  const user = await requireUser();

  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer || offer.userId !== user.id || offer.listingId !== listingId || offer.status !== "PENDING") {
    throw new Error("Bu teklif düzenlenemez.");
  }

  const message = String(formData.get("message") ?? "").trim();
  const quantity = Math.max(1, Math.round(numberOrNull(formData.get("quantity")) ?? 1));

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      offers: {
        where: { status: { in: ["PENDING", "ACCEPTED"] }, id: { not: offerId } },
        select: { quantity: true, status: true },
      },
    },
  });
  if (!listing || listing.groupId !== groupId) {
    throw new Error("İlan bulunamadı.");
  }
  if (listing.status !== "OPEN") {
    throw new Error("Bu ilan şu anda teklif kabul etmiyor.");
  }
  if (listing.minAlim && quantity < listing.minAlim) {
    throw new Error(`Minimum alım miktarı ${listing.minAlim}.`);
  }
  if (listing.maxAlim && quantity > listing.maxAlim) {
    throw new Error(`Maksimum alım miktarı ${listing.maxAlim}.`);
  }
  if (listing.alimKatlari && quantity % listing.alimKatlari !== 0) {
    throw new Error(`Alım miktarı ${listing.alimKatlari} adedin katları olmalı.`);
  }
  checkStockCap(listing, listing.offers, quantity);

  const unitPrice = effectiveUnitPrice(listing) ?? 0;
  const totalPrice = unitPrice * quantity;
  await assertWithinBalanceLimit({ groupId, userId: user.id, amount: totalPrice, excludeOfferId: offerId });

  await prisma.offer.update({
    where: { id: offerId },
    data: { message: message || null, quantity, unitPrice, totalPrice },
  });

  revalidatePath(`/groups/${groupId}/listings/${listingId}`);
}

export async function respondOfferAction(
  groupId: string,
  listingId: string,
  offerId: string,
  accept: boolean
) {
  const user = await requireUser();

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.userId !== user.id) {
    throw new Error("Bu ilana ait değilsiniz.");
  }

  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer) {
    throw new Error("Geçersiz teklif.");
  }

  if (accept) {
    await acceptOffer(listing, offer, user.id);
  } else {
    await rejectOffer(listing, offer);
  }

  revalidatePath(`/groups/${groupId}/listings/${listingId}`);
  revalidatePath(`/groups/${groupId}/balances`);

  if (accept) {
    redirect(`/groups/${groupId}/listings/${listingId}/offers/${offerId}/prepare`);
  }
}

export async function reopenListingAction(groupId: string, listingId: string) {
  const user = await requireUser();

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.groupId !== groupId || listing.userId !== user.id) {
    throw new Error("Bu ilana ait değilsiniz.");
  }

  const data: { status: "OPEN"; targetReachedAt?: null } = { status: "OPEN" };
  if (listing.targetReachedAt && listing.totalStock != null) {
    const accepted = await prisma.offer.findMany({
      where: { listingId, status: "ACCEPTED" },
      select: { quantity: true },
    });
    const soldQty = accepted.reduce((sum, o) => sum + o.quantity, 0);
    if (soldQty >= listing.totalStock) {
      throw new Error("Bu ilanın stoğu tükendi. Yeniden yayınlamak için önce toplam stoğu artırın.");
    }
    data.targetReachedAt = null;
  }

  await prisma.listing.update({ where: { id: listingId }, data });
  await logListingChanges(listing, user.id, [
    { type: "DURUM", oldValue: LISTING_STATUS_TR[listing.status], newValue: "Açık (yeniden yayında)" },
  ]);

  revalidatePath(`/groups/${groupId}/listings/${listingId}`);
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/listings");
}

/**
 * Depo özel şartı ilanını stoktaki ürüne dönüştürür. Formda kesinleşen depo
 * şartı (ulaşılan kademe) girilirse ilan şartları güncellenir; fiyat düşerse
 * bekleyen teklifler yeni fiyata otomatik çekilir, yükselirse alıcı onayı
 * için ilan sayfasında uyarı çıkar.
 */
export async function convertToStockAction(groupId: string, listingId: string, formData?: FormData) {
  const user = await requireUser();

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.groupId !== groupId || listing.userId !== user.id) {
    throw new Error("Bu ilana ait değilsiniz.");
  }
  if (listing.listingKind !== "DEPO_OZEL_SART") {
    throw new Error("Bu ilan zaten stoktaki ürün olarak yayında.");
  }

  const data: {
    listingKind: "STOK";
    totalStock?: number;
    dealBonusQuantity?: number | null;
    ekstraIskontoYuzde?: number | null;
    ekstraIndirim?: number | null;
  } = { listingKind: "STOK" };

  const finalStock = numberOrNull(formData?.get("finalTotalStock") ?? null);
  if (finalStock != null) {
    if (finalStock <= 0 || !Number.isInteger(finalStock)) {
      throw new Error("Toplam stok 1 veya daha büyük bir tam sayı olmalı.");
    }
    const finalBonus = numberOrNull(formData!.get("finalBonus")) ?? 0;
    if (finalBonus < 0 || finalBonus >= finalStock) {
      throw new Error("Mal fazlası, toplam stoktan küçük olmalı.");
    }
    const iskontoYuzde = numberOrNull(formData!.get("finalIskontoYuzde"));
    if (iskontoYuzde != null && (iskontoYuzde < 0 || iskontoYuzde > 100)) {
      throw new Error("İskonto yüzdesi 0-100 arasında olmalı.");
    }
    const iskontoTL = numberOrNull(formData!.get("finalIskontoTL"));
    if (iskontoTL != null && iskontoTL < 0) throw new Error("İskonto tutarı negatif olamaz.");
    data.totalStock = finalStock;
    data.dealBonusQuantity = finalBonus || null;
    data.ekstraIskontoYuzde = iskontoYuzde || null;
    data.ekstraIndirim = iskontoTL || null;
  }

  const oldNet = effectiveUnitPrice(listing);
  const updated = await prisma.listing.update({ where: { id: listingId }, data });
  const newNet = effectiveUnitPrice(updated);

  const changes: ListingChangeInput[] = [
    { type: "DURUM", oldValue: "Depo Özel Şartı", newValue: "Stoğa Dönüştürüldü" },
  ];
  const oldTerms = describeTerms(listing);
  const newTerms = describeTerms(updated);
  if (oldTerms !== newTerms || listing.totalStock !== updated.totalStock) {
    changes.push({
      type: "SART",
      oldValue: `${listing.totalStock ?? "—"} adet · ${oldTerms} (net ${fmtMoney(oldNet)})`,
      newValue: `${updated.totalStock ?? "—"} adet · ${newTerms} (net ${fmtMoney(newNet)})`,
    });
  }
  await logListingChanges(listing, user.id, changes);

  const pendingOffers = await prisma.offer.findMany({
    where: { listingId, status: "PENDING" },
    select: { id: true, userId: true, quantity: true, unitPrice: true },
  });
  for (const o of pendingOffers) {
    if (newNet != null && o.unitPrice != null && newNet < o.unitPrice - 0.001) {
      await prisma.offer.update({
        where: { id: o.id },
        data: { unitPrice: newNet, totalPrice: newNet * o.quantity },
      });
      await createNotification({
        userId: o.userId,
        message: `"${listing.title}" ilanı stoğa dönüştü ve birim fiyat ${fmtMoney(o.unitPrice)} yerine ${fmtMoney(newNet)} oldu; teklifiniz yeni fiyata güncellendi.`,
        link: `/groups/${groupId}/listings/${listingId}`,
      });
    } else {
      await createNotification({
        userId: o.userId,
        message: `"${listing.title}" ilanı stoğa dönüştü, teklifiniz değerlendirmeye alınacak.`,
        link: `/groups/${groupId}/listings/${listingId}`,
      });
    }
  }

  revalidatePath(`/groups/${groupId}/listings/${listingId}`);
  revalidatePath("/offers/received");
}

export async function confirmOfferPriceChangeAction(groupId: string, listingId: string, offerId: string) {
  const user = await requireUser();

  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer || offer.userId !== user.id || offer.listingId !== listingId || offer.status !== "PENDING") {
    throw new Error("Bu teklif güncellenemez.");
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.groupId !== groupId) {
    throw new Error("İlan bulunamadı.");
  }

  const unitPrice = effectiveUnitPrice(listing) ?? 0;
  const totalPrice = unitPrice * offer.quantity;

  await prisma.offer.update({ where: { id: offerId }, data: { unitPrice, totalPrice } });

  revalidatePath(`/groups/${groupId}/listings/${listingId}`);
}

export async function withdrawOfferAction(groupId: string, listingId: string, offerId: string) {
  const user = await requireUser();

  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer || offer.userId !== user.id || offer.listingId !== listingId || offer.status !== "PENDING") {
    throw new Error("Bu teklif iptal edilemez.");
  }

  await prisma.offer.delete({ where: { id: offerId } });

  revalidatePath(`/groups/${groupId}/listings/${listingId}`);
}

export type ImportRow = {
  medicineName: string;
  barkod?: string | null;
  birimFiyat: number | null;
  totalStock: number | null;
  dealBonusQuantity?: number | null;
  expiryDate?: string | null;
  kdvOrani?: number | null;
  description?: string | null;
  minAlim?: number | null;
  maxAlim?: number | null;
  alimKatlari?: number | null;
};

const MAX_IMPORT_ROWS = 300;

/** Excel/CSV'den okunan satırlardan toplu "Stoğumdaki Ürün" ilanı oluşturur. */
export async function importListingsAction(
  groupId: string,
  rows: ImportRow[]
): Promise<{ created: number; errors: { row: number; message: string }[] }> {
  const user = await requireUser();
  await requireApprovedMember(groupId, user);

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group || group.closedAt) {
    return { created: 0, errors: [{ row: 0, message: "Bu grup kapatıldığı için yeni ilan verilemiyor." }] };
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  let created = 0;
  const errors: { row: number; message: string }[] = [];

  for (const [index, row] of rows.slice(0, MAX_IMPORT_ROWS).entries()) {
    const rowNo = index + 1;
    const medicineName = String(row.medicineName ?? "").trim().toLocaleUpperCase("tr-TR");
    const birimFiyat = row.birimFiyat;
    const totalStock = row.totalStock != null ? Math.round(row.totalStock) : null;
    const bonus = row.dealBonusQuantity != null ? Math.round(row.dealBonusQuantity) : null;
    const expiryDate = row.expiryDate ? new Date(row.expiryDate) : null;
    const kdvOrani = row.kdvOrani ?? 10;
    const isBakiyeTransferi = medicineName === "BAKİYE TRANSFERİ";

    let message: string | null = null;
    if (!medicineName) message = "İlaç adı boş.";
    else if (birimFiyat == null || !Number.isFinite(birimFiyat) || birimFiyat <= 0) message = "Depo fiyatı geçersiz.";
    else if (totalStock == null || totalStock <= 0) message = "Toplam stok geçersiz.";
    else if (bonus != null && (bonus < 0 || bonus >= totalStock)) message = "MF, toplam stoktan küçük olmalı.";
    else if (!isBakiyeTransferi && (!expiryDate || Number.isNaN(expiryDate.getTime()))) message = "SKT eksik ya da okunamadı.";
    else if (kdvOrani < 0 || kdvOrani > 100) message = "KDV oranı 0-100 arasında olmalı.";
    else if (row.alimKatlari != null && (row.alimKatlari < 1 || !Number.isInteger(row.alimKatlari))) {
      message = "Alım katları 1 veya daha büyük bir tam sayı olmalı.";
    }
    if (message) {
      errors.push({ row: rowNo, message });
      continue;
    }

    await prisma.listing.create({
      data: {
        groupId,
        userId: user.id,
        title: medicineName,
        medicineName,
        barkod: row.barkod?.trim() || null,
        description: row.description?.trim() || null,
        birimFiyat,
        totalStock,
        dealBonusQuantity: bonus || null,
        kdvOrani,
        expiryDate: isBakiyeTransferi ? null : expiryDate,
        minAlim: row.minAlim ?? null,
        maxAlim: row.maxAlim ?? null,
        alimKatlari: row.alimKatlari ?? null,
        startDate,
        endDate,
        listingKind: "STOK",
      },
    });
    created++;
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    errors.push({ row: MAX_IMPORT_ROWS + 1, message: `Tek seferde en fazla ${MAX_IMPORT_ROWS} satır aktarılabilir.` });
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/listings");
  revalidatePath("/market");
  return { created, errors };
}

/** "Teklif Yönlendirme": ilanı gruptaki bir eczaneye bildirimle önerir. */
export async function recommendListingAction(groupId: string, listingId: string, formData: FormData) {
  const user = await requireUser();
  await requireApprovedMember(groupId, user);

  const targetUserId = String(formData.get("targetUserId") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 200);

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.groupId !== groupId || listing.status !== "OPEN") {
    throw new Error("İlan bulunamadı ya da yayında değil.");
  }
  if (listing.targetUserId && listing.userId !== user.id) {
    throw new Error("Eczaneye özel ilanlar başka eczaneye yönlendirilemez.");
  }
  const target = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });
  if (!target || target.status !== "APPROVED" || targetUserId === user.id) {
    throw new Error("Seçilen eczane bu grubun onaylı üyesi değil.");
  }

  await createNotification({
    userId: targetUserId,
    message: `${user.pharmacyName ?? user.contactName} eczanesi size "${listing.title}" ilanını yönlendirdi${
      note ? `: "${note}"` : "."
    }`,
    link: `/groups/${groupId}/listings/${listingId}`,
  });

  revalidatePath(`/groups/${groupId}/listings/${listingId}`);
}
