import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { effectiveUnitPrice } from "@/lib/pricing";

type NewListing = {
  id: string;
  groupId: string;
  userId: string;
  medicineName: string;
  barkod: string | null;
  targetUserId: string | null;
  birimFiyat: number | null;
  totalStock: number | null;
  dealBonusQuantity: number | null;
  ekstraIndirim: number | null;
  ekstraIskontoYuzde: number | null;
};

/**
 * Yeni çıkan bir ilanı, ilanın grubundaki üyelerden bu ürünü favorilerine
 * eklemiş olanlara "Ürün Bildirimi" olarak iletir. Eczaneye özel ilanlar
 * sadece hedef eczaneye bildirilir.
 */
export async function notifyFavoriteWatchers(listing: NewListing, sellerName: string) {
  const members = await prisma.groupMember.findMany({
    where: { groupId: listing.groupId, status: "APPROVED", userId: { not: listing.userId } },
    select: { userId: true },
  });
  const memberIds = members
    .map((m) => m.userId)
    .filter((id) => !listing.targetUserId || id === listing.targetUserId);
  if (memberIds.length === 0) return;

  const favorites = await prisma.favoriteProduct.findMany({
    where: {
      userId: { in: memberIds },
      OR: [{ medicineName: listing.medicineName }, ...(listing.barkod ? [{ barkod: listing.barkod }] : [])],
    },
    select: { userId: true },
  });
  const watcherIds = Array.from(new Set(favorites.map((f) => f.userId)));
  if (watcherIds.length === 0) return;

  const net = effectiveUnitPrice(listing);
  await Promise.all(
    watcherIds.map((userId) =>
      createNotification({
        userId,
        message: `★ Favori ürününüz gruba çıktı: ${listing.medicineName} — ${sellerName}${
          net != null ? ` · ${net.toFixed(2)} ₺ net` : ""
        }`,
        link: `/groups/${listing.groupId}/listings/${listing.id}`,
      })
    )
  );
}
