"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { requireApprovedMember } from "@/lib/group-access";

export type ListingState = { error?: string } | undefined;

export async function createListingAction(
  groupId: string,
  _prevState: ListingState,
  formData: FormData
): Promise<ListingState> {
  const user = await requireUser();
  await requireApprovedMember(groupId, user.id);

  const title = String(formData.get("title") ?? "").trim();
  const medicineName = String(formData.get("medicineName") ?? "").trim();
  const quantity = String(formData.get("quantity") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const expiry = String(formData.get("expiryDate") ?? "").trim();

  if (!title) return { error: "Başlık gerekli." };
  if (!medicineName) return { error: "İlaç adı gerekli." };

  await prisma.listing.create({
    data: {
      groupId,
      userId: user.id,
      title,
      medicineName,
      quantity: quantity || null,
      description: description || null,
      expiryDate: expiry ? new Date(expiry) : null,
    },
  });

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

export async function createOfferAction(
  groupId: string,
  listingId: string,
  formData: FormData
) {
  const user = await requireUser();
  await requireApprovedMember(groupId, user.id);

  const message = String(formData.get("message") ?? "").trim();

  await prisma.offer.create({
    data: { listingId, userId: user.id, message: message || null },
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

  await prisma.offer.update({
    where: { id: offerId },
    data: { status: accept ? "ACCEPTED" : "REJECTED" },
  });

  if (accept) {
    await prisma.listing.update({
      where: { id: listingId },
      data: { status: "MATCHED" },
    });
  }

  revalidatePath(`/groups/${groupId}/listings/${listingId}`);
}
