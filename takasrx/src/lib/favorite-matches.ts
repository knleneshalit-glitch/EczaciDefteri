import { prisma } from "@/lib/prisma";

/**
 * Kullanıcının üye olduğu gruplarda, favori ürünleriyle eşleşen ve
 * kullanıcının görebileceği açık ilanları getirir (kendi ilanları hariç).
 */
export async function findFavoriteMatches(userId: string, favorites: { medicineName: string; barkod: string | null }[]) {
  if (favorites.length === 0) return [];
  const memberships = await prisma.groupMember.findMany({
    where: { userId, status: "APPROVED" },
    select: { groupId: true },
  });
  const groupIds = memberships.map((m) => m.groupId);
  if (groupIds.length === 0) return [];

  const names = favorites.map((f) => f.medicineName);
  const barkods = favorites.map((f) => f.barkod).filter((b): b is string => !!b);

  return prisma.listing.findMany({
    where: {
      status: "OPEN",
      groupId: { in: groupIds },
      userId: { not: userId },
      AND: [
        { OR: [{ targetUserId: null }, { targetUserId: userId }] },
        { OR: [{ medicineName: { in: names } }, ...(barkods.length ? [{ barkod: { in: barkods } }] : [])] },
      ],
    },
    include: {
      group: { select: { name: true } },
      user: { select: { pharmacyName: true, contactName: true } },
      offers: { where: { status: "ACCEPTED" }, select: { quantity: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
