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
  groupId: string,
  _prevState: ListingState,
  formData: FormData
): Promise<ListingState> {
  const user = await requireUser();
  await requireApprovedMember(groupId, user.id);

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group || group.closedAt) {
    return { error: "Bu grup kapatıldığı için yeni ilan verilemiyor." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const medicineName = String(formData.get("medicineName") ?? "").trim();
  const barkod = String(formData.get("barkod") ?? "").trim();
  const quantity = String(formData.get("quantity") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title) return { error: "Başlık gerekli." };
  if (!medicineName) return { error: "İlaç adı gerekli." };

  const birimFiyat = numberOrNull(formData.get("birimFiyat"));
  if (birimFiyat === null || birimFiyat <= 0) {
    return { error: "Geçerli bir depo (birim) fiyatı girin." };
  }

  const totalStock = numberOrNull(formData.get("totalStock"));
  const dealBonusQuantity = numberOrNull(formData.get("dealBonusQuantity"));
  if (dealBonusQuantity != null && (!totalStock || dealBonusQuantity >= totalStock)) {
    return { error: "Mal fazlası, toplam stoktan küçük olmalı." };
  }

  await prisma.listing.create({
    data: {
      groupId,
      userId: user.id,
      title,
      medicineName,
      barkod: barkod || null,
      quantity: quantity || null,
      description: description || null,
      totalStock,
      birimFiyat,
      dealBonusQuantity,
      etiketFiyati: numberOrNull(formData.get("etiketFiyati")),
      startDate: dateOrNull(formData.get("startDate")),
      endDate: dateOrNull(formData.get("endDate")),
      hedefAlim: numberOrNull(formData.get("hedefAlim")),
      maxAlim: numberOrNull(formData.get("maxAlim")),
      minAlim: numberOrNull(formData.get("minAlim")),
      alimKatlari: numberOrNull(formData.get("alimKatlari")),
      expiryDate: dateOrNull(formData.get("expiryDate")),
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
    include: { offers: { where: { status: "ACCEPTED" }, select: { id: true } } },
  });
  if (!listing || listing.groupId !== groupId || listing.userId !== user.id) {
    return { error: "Bu ilana ait değilsiniz." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const medicineName = String(formData.get("medicineName") ?? "").trim();
  const barkod = String(formData.get("barkod") ?? "").trim();
  const quantity = String(formData.get("quantity") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title) return { error: "Başlık gerekli." };
  if (!medicineName) return { error: "İlaç adı gerekli." };

  const hasAcceptedOffers = listing.offers.length > 0;

  const data: Parameters<typeof prisma.listing.update>[0]["data"] = {
    title,
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

  if (!hasAcceptedOffers) {
    const birimFiyat = numberOrNull(formData.get("birimFiyat"));
    if (birimFiyat === null || birimFiyat <= 0) {
      return { error: "Geçerli bir depo (birim) fiyatı girin." };
    }
    const totalStock = numberOrNull(formData.get("totalStock"));
    const dealBonusQuantity = numberOrNull(formData.get("dealBonusQuantity"));
    if (dealBonusQuantity != null && (!totalStock || dealBonusQuantity >= totalStock)) {
      return { error: "Mal fazlası, toplam stoktan küçük olmalı." };
    }
    data.birimFiyat = birimFiyat;
    data.totalStock = totalStock;
    data.dealBonusQuantity = dealBonusQuantity;
  }

  await prisma.listing.update({ where: { id: listingId }, data });

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

export async function createOfferAction(
  groupId: string,
  listingId: string,
  formData: FormData
) {
  const user = await requireUser();
  await requireApprovedMember(groupId, user.id);

  const message = String(formData.get("message") ?? "").trim();
  const quantity = Math.max(1, Math.round(numberOrNull(formData.get("quantity")) ?? 1));

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { offers: { where: { status: "ACCEPTED" }, select: { quantity: true } } },
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
  if (listing.totalStock != null) {
    const soldQty = listing.offers.reduce((sum, o) => sum + o.quantity, 0);
    const remaining = listing.totalStock - soldQty;
    if (quantity > remaining) {
      throw new Error(`Stokta sadece ${remaining} adet kaldı.`);
    }
  }

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
  if (!offer || offer.listingId !== listingId || offer.status !== "PENDING") {
    throw new Error("Geçersiz teklif.");
  }

  await prisma.offer.update({
    where: { id: offerId },
    data: { status: accept ? "ACCEPTED" : "REJECTED" },
  });

  if (accept) {
    if (listing.totalStock != null) {
      const acceptedOffers = await prisma.offer.findMany({
        where: { listingId, status: "ACCEPTED" },
        select: { quantity: true },
      });
      const soldQty = acceptedOffers.reduce((sum, o) => sum + o.quantity, 0);
      if (soldQty >= listing.totalStock) {
        await prisma.listing.update({ where: { id: listingId }, data: { status: "CLOSED" } });
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
}
