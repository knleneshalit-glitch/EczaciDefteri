import type { ListingChangeType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ListingChangeInput = { type: ListingChangeType; oldValue: string | null; newValue: string | null };

/** İlanda yapılan değişiklikleri "Teklif Güncellemeleri" kaydına yazar. */
export async function logListingChanges(
  listing: { id: string; groupId: string },
  userId: string,
  changes: ListingChangeInput[],
  note?: string | null
) {
  if (changes.length === 0) return;
  await prisma.listingChange.createMany({
    data: changes.map((c) => ({
      listingId: listing.id,
      groupId: listing.groupId,
      userId,
      changeType: c.type,
      oldValue: c.oldValue,
      newValue: c.newValue,
      note: note || null,
    })),
  });
}
