"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { requireApprovedMember } from "@/lib/group-access";
import { matchTier, netUnitPrice, type TierInput } from "@/lib/tiers";
import { recordTrade } from "@/lib/ledger";

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

  let tiers: TierInput[] = [];
  const tiersRaw = String(formData.get("tiers") ?? "[]");
  try {
    const parsed = JSON.parse(tiersRaw);
    if (Array.isArray(parsed)) {
      tiers = parsed
        .map((t) => ({
          minQuantity: Number(t.minQuantity) || 0,
          bonusQuantity: Number(t.bonusQuantity) || 0,
          discountPercent: Number(t.discountPercent) || 0,
          discountAmount: Number(t.discountAmount) || 0,
        }))
        .filter((t) => t.minQuantity > 0);
    }
  } catch {
    return { error: "Teklif şartları geçersiz." };
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
      totalStock: numberOrNull(formData.get("totalStock")),
      birimFiyat,
      etiketFiyati: numberOrNull(formData.get("etiketFiyati")),
      startDate: dateOrNull(formData.get("startDate")),
      endDate: dateOrNull(formData.get("endDate")),
      hedefAlim: numberOrNull(formData.get("hedefAlim")),
      maxAlim: numberOrNull(formData.get("maxAlim")),
      minAlim: numberOrNull(formData.get("minAlim")),
      alimKatlari: numberOrNull(formData.get("alimKatlari")),
      expiryDate: dateOrNull(formData.get("expiryDate")),
      tiers: {
        create: tiers.map((t, i) => ({
          order: i,
          minQuantity: t.minQuantity,
          bonusQuantity: t.bonusQuantity,
          discountPercent: t.discountPercent,
          discountAmount: t.discountAmount,
        })),
      },
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
  const quantity = Math.max(1, Math.round(numberOrNull(formData.get("quantity")) ?? 1));

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { tiers: true },
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

  const birimFiyat = listing.birimFiyat ?? 0;
  const tier = matchTier(listing.tiers, quantity);
  const unitPrice = netUnitPrice(birimFiyat, tier);
  const totalPrice = unitPrice * quantity;

  await prisma.offer.create({
    data: {
      listingId,
      userId: user.id,
      message: message || null,
      quantity,
      unitPrice,
      totalPrice,
      bonusQuantity: tier?.bonusQuantity ?? 0,
    },
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
    await prisma.listing.update({
      where: { id: listingId },
      data: { status: "MATCHED" },
    });

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

  revalidatePath(`/groups/${groupId}/listings/${listingId}`);
  revalidatePath(`/groups/${groupId}/balances`);
}
