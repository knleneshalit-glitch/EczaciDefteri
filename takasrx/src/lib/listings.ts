import { prisma } from "@/lib/prisma";

const TARGET_REACHED_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * Alım hedefine ulaşıp süresi (1 gün) dolan, hâlâ OPEN durumundaki
 * ilanları CLOSED'a çevirir. Hedefe ulaşan ilanlar hemen kapanmaz;
 * grup üyeleri bir gün boyunca "Hedefe Ulaşıldı" olarak görebilsin diye
 * açık tutulur.
 */
export async function closeExpiredTargetListings(groupId: string) {
  await closeExpiredTargetListingsForGroups([groupId]);
}

export async function closeExpiredTargetListingsForGroups(groupIds: string[]) {
  if (groupIds.length === 0) return;
  const cutoff = new Date(Date.now() - TARGET_REACHED_GRACE_MS);
  await prisma.listing.updateMany({
    where: {
      groupId: { in: groupIds },
      status: "OPEN",
      targetReachedAt: { not: null, lte: cutoff },
    },
    data: { status: "CLOSED" },
  });
}
