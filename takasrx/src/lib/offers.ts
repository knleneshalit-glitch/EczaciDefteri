import { prisma } from "@/lib/prisma";
import { recordTrade } from "@/lib/ledger";
import { createNotification } from "@/lib/notifications";
import { logListingChanges } from "@/lib/listing-log";

type ListingRef = {
  id: string;
  groupId: string;
  userId: string;
  title: string;
  totalStock: number | null;
  targetReachedAt: Date | null;
  listingKind: string;
};

type OfferRef = {
  id: string;
  listingId: string;
  userId: string;
  quantity: number;
  totalPrice: number | null;
  status: string;
};

async function soldQuantity(listingId: string) {
  const agg = await prisma.offer.aggregate({
    where: { listingId, status: "ACCEPTED" },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

/**
 * Bekleyen bir alım teklifini kabul eder: stok kontrolü, hedefe ulaşma
 * işareti, cari hesaba alım/satış kaydı ve alıcıya bildirim.
 */
export async function acceptOffer(listing: ListingRef, offer: OfferRef, actorId: string) {
  if (listing.listingKind === "DEPO_OZEL_SART") {
    throw new Error("Bu ilan depo özel şartı aşamasında. Önce ürünü stoğa dönüştürün.");
  }
  if (offer.listingId !== listing.id || offer.status !== "PENDING") {
    throw new Error("Geçersiz teklif.");
  }

  const soldBefore = await soldQuantity(listing.id);
  if (listing.totalStock != null && soldBefore + offer.quantity > listing.totalStock) {
    throw new Error(
      `"${listing.title}" için stokta sadece ${Math.max(0, listing.totalStock - soldBefore)} adet kaldı.`
    );
  }

  await prisma.offer.update({
    where: { id: offer.id },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });

  const soldQty = soldBefore + offer.quantity;
  if (listing.totalStock != null && !listing.targetReachedAt && soldQty >= listing.totalStock) {
    // Hedefe ulaşıldığında ilan hemen kapanmaz; grup üyeleri "Hedefe
    // Ulaşıldı" rozetiyle bir gün daha görebilsin diye açık kalır.
    await prisma.listing.update({ where: { id: listing.id }, data: { targetReachedAt: new Date() } });
    await logListingChanges(listing, actorId, [
      { type: "DURUM", oldValue: "Açık", newValue: `Hedefe Ulaşıldı (${soldQty} adet satıldı)` },
    ]);
  }

  if (offer.totalPrice && offer.totalPrice > 0) {
    await recordTrade({
      groupId: listing.groupId,
      buyerId: offer.userId,
      sellerId: listing.userId,
      amount: offer.totalPrice,
      offerId: offer.id,
      note: `${listing.title} (${offer.quantity} adet)`,
    });
  }

  await createNotification({
    userId: offer.userId,
    message: `Teklifiniz kabul edildi: ${listing.title}.`,
    link: `/groups/${listing.groupId}/listings/${listing.id}`,
  });
}

export async function rejectOffer(listing: ListingRef, offer: OfferRef) {
  if (listing.listingKind === "DEPO_OZEL_SART") {
    throw new Error("Bu ilan depo özel şartı aşamasında. Önce ürünü stoğa dönüştürün.");
  }
  if (offer.listingId !== listing.id || offer.status !== "PENDING") {
    throw new Error("Geçersiz teklif.");
  }

  await prisma.offer.update({ where: { id: offer.id }, data: { status: "REJECTED" } });

  await createNotification({
    userId: offer.userId,
    message: `Teklifiniz reddedildi: ${listing.title}.`,
    link: `/groups/${listing.groupId}/listings/${listing.id}`,
  });
}

/**
 * Kabul edilmiş ama sevkiyatçı tarafından henüz teslim alınmamış bir
 * gönderimi iptal eder: sevkiyat kaydı silinir, cari hesaptaki alım/satış
 * ters kayıtla geri alınır ve stok tekrar satışa açılır.
 */
export async function cancelAcceptedOffer(
  listing: ListingRef & { status: string },
  offer: OfferRef & { shipment: { id: string; status: string } | null },
  sellerName: string
) {
  if (offer.status !== "ACCEPTED") {
    throw new Error("Sadece kabul edilmiş gönderimler iptal edilebilir.");
  }
  if (offer.shipment && offer.shipment.status !== "HAZIRLANIYOR") {
    throw new Error(`"${listing.title}" sevkiyatçı tarafından teslim alındığı için iptal edilemez.`);
  }

  await prisma.$transaction(async (tx) => {
    if (offer.shipment) await tx.shipment.delete({ where: { id: offer.shipment.id } });
    await tx.offer.update({ where: { id: offer.id }, data: { status: "CANCELLED" } });
    if (offer.totalPrice && offer.totalPrice > 0) {
      const note = `İptal edilen gönderim: ${listing.title} (${offer.quantity} adet)`;
      await tx.ledgerEntry.createMany({
        data: [
          { groupId: listing.groupId, userId: offer.userId, type: "TRADE", amount: Math.abs(offer.totalPrice), offerId: offer.id, note },
          { groupId: listing.groupId, userId: listing.userId, type: "TRADE", amount: -Math.abs(offer.totalPrice), offerId: offer.id, note },
        ],
      });
    }
  });

  if (listing.targetReachedAt && listing.totalStock != null && listing.status === "OPEN") {
    const sold = await soldQuantity(listing.id);
    if (sold < listing.totalStock) {
      await prisma.listing.update({ where: { id: listing.id }, data: { targetReachedAt: null } });
    }
  }

  await createNotification({
    userId: offer.userId,
    message: `${sellerName} eczanesi "${listing.title}" gönderiminizi iptal etti; ${
      offer.totalPrice ? `${offer.totalPrice.toFixed(2)} ₺ cari hesabınıza iade edildi.` : "işlem geri alındı."
    }`,
    link: `/groups/${listing.groupId}/listings/${listing.id}`,
  });
}
