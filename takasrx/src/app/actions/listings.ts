"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { requireApprovedMember } from "@/lib/group-access";
import { effectiveUnitPrice } from "@/lib/pricing";
import { recordTrade } from "@/lib/ledger";
import { createNotification } from "@/lib/notifications";

export type ListingState = { error?: string } | undefined;

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
      alimKatlari: numberOrNull(formData.get("alimKatlari")),
      expiryDate,
      listingKind,
      allowExceedDemand,
      targetUserId,
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
    },
  });
  if (!listing || listing.groupId !== groupId || listing.userId !== user.id) {
    return { error: "Bu ilana ait değilsiniz." };
  }

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

  const newNetFiyat = effectiveUnitPrice({
    birimFiyat: (data.birimFiyat ?? listing.birimFiyat) as number | null,
    totalStock: (data.totalStock ?? listing.totalStock) as number | null,
    dealBonusQuantity: (data.dealBonusQuantity ?? listing.dealBonusQuantity) as number | null,
    ekstraIndirim: (data.ekstraIndirim ?? listing.ekstraIndirim) as number | null,
    ekstraIskontoYuzde: (data.ekstraIskontoYuzde ?? listing.ekstraIskontoYuzde) as number | null,
  });

  await prisma.listing.update({ where: { id: listingId }, data });

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

  revalidatePath(`/groups/${groupId}/listings/${listingId}`);
  revalidatePath(`/groups/${groupId}`);
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
  if (listing.minAlim && quantity < listing.minAlim) {
    throw new Error(`Minimum alım miktarı ${listing.minAlim}.`);
  }
  if (listing.maxAlim && quantity > listing.maxAlim) {
    throw new Error(`Maksimum alım miktarı ${listing.maxAlim}.`);
  }
  checkStockCap(listing, listing.offers, quantity);

  const unitPrice = effectiveUnitPrice(listing) ?? 0;
  const totalPrice = unitPrice * quantity;

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
  if (listing.minAlim && quantity < listing.minAlim) {
    throw new Error(`Minimum alım miktarı ${listing.minAlim}.`);
  }
  if (listing.maxAlim && quantity > listing.maxAlim) {
    throw new Error(`Maksimum alım miktarı ${listing.maxAlim}.`);
  }
  checkStockCap(listing, listing.offers, quantity);

  const unitPrice = effectiveUnitPrice(listing) ?? 0;
  const totalPrice = unitPrice * quantity;

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
  if (listing.listingKind === "DEPO_OZEL_SART") {
    throw new Error("Bu ilan depo özel şartı aşamasında. Önce ürünü stoğa dönüştürün.");
  }

  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer || offer.listingId !== listingId || offer.status !== "PENDING") {
    throw new Error("Geçersiz teklif.");
  }

  await prisma.offer.update({
    where: { id: offerId },
    data: { status: accept ? "ACCEPTED" : "REJECTED" },
  });

  if (accept) {
    if (listing.totalStock != null && !listing.targetReachedAt) {
      const acceptedOffers = await prisma.offer.findMany({
        where: { listingId, status: "ACCEPTED" },
        select: { quantity: true },
      });
      const soldQty = acceptedOffers.reduce((sum, o) => sum + o.quantity, 0);
      if (soldQty >= listing.totalStock) {
        // Hedefe ulaşıldığında ilan hemen kapanmaz; grup üyeleri "Hedefe
        // Ulaşıldı" rozetiyle bir gün daha görebilsin diye açık kalır.
        await prisma.listing.update({ where: { id: listingId }, data: { targetReachedAt: new Date() } });
      }
    }

    if (offer.totalPrice && offer.totalPrice > 0) {
      await recordTrade({
        groupId,
        buyerId: offer.userId,
        sellerId: user.id,
        amount: offer.totalPrice,
        offerId: offer.id,
        note: `${listing.title} (${offer.quantity} adet)`,
      });
    }
  }

  await createNotification({
    userId: offer.userId,
    message: accept
      ? `Teklifiniz kabul edildi: ${listing.title}.`
      : `Teklifiniz reddedildi: ${listing.title}.`,
    link: `/groups/${groupId}/listings/${listingId}`,
  });

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

  await prisma.listing.update({ where: { id: listingId }, data: { status: "OPEN" } });

  revalidatePath(`/groups/${groupId}/listings/${listingId}`);
  revalidatePath(`/groups/${groupId}`);
}

export async function convertToStockAction(groupId: string, listingId: string) {
  const user = await requireUser();

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.groupId !== groupId || listing.userId !== user.id) {
    throw new Error("Bu ilana ait değilsiniz.");
  }
  if (listing.listingKind !== "DEPO_OZEL_SART") {
    throw new Error("Bu ilan zaten stoktaki ürün olarak yayında.");
  }

  await prisma.listing.update({ where: { id: listingId }, data: { listingKind: "STOK" } });

  const pendingOffers = await prisma.offer.findMany({
    where: { listingId, status: "PENDING" },
    select: { userId: true },
  });
  await Promise.all(
    pendingOffers.map((o) =>
      createNotification({
        userId: o.userId,
        message: `"${listing.title}" ilanı stoğa dönüştü, teklifiniz değerlendirmeye alınacak.`,
        link: `/groups/${groupId}/listings/${listingId}`,
      })
    )
  );

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
