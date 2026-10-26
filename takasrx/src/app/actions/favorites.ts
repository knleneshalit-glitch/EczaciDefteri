"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePharmacy } from "@/lib/require-user";

export type FavoriteState = { error?: string; success?: string } | undefined;

function revalidateFavoriteViews() {
  revalidatePath("/favorites");
  revalidatePath("/dashboard");
}

export async function addFavoriteAction(_prevState: FavoriteState, formData: FormData): Promise<FavoriteState> {
  const user = await requirePharmacy();
  const medicineName = String(formData.get("medicineName") ?? "").trim().toLocaleUpperCase("tr-TR");
  const barkod = String(formData.get("barkod") ?? "").trim();

  if (!medicineName) return { error: "Ürün adı gerekli." };

  await prisma.favoriteProduct.upsert({
    where: { userId_medicineName: { userId: user.id, medicineName } },
    update: { barkod: barkod || undefined },
    create: { userId: user.id, medicineName, barkod: barkod || null },
  });

  revalidateFavoriteViews();
  return { success: `${medicineName} favorilerinize eklendi. Gruplarınızda ilana çıkınca bildirim alacaksınız.` };
}

/** İlan sayfasındaki yıldız: ürün favorideyse çıkarır, değilse ekler. */
export async function toggleFavoriteAction(medicineName: string, barkod: string | null, listingPath: string) {
  const user = await requirePharmacy();
  const name = medicineName.trim().toLocaleUpperCase("tr-TR");
  if (!name) return;

  const existing = await prisma.favoriteProduct.findUnique({
    where: { userId_medicineName: { userId: user.id, medicineName: name } },
  });
  if (existing) {
    await prisma.favoriteProduct.delete({ where: { id: existing.id } });
  } else {
    await prisma.favoriteProduct.create({ data: { userId: user.id, medicineName: name, barkod: barkod || null } });
  }

  revalidateFavoriteViews();
  if (listingPath.startsWith("/groups/")) revalidatePath(listingPath);
}

export async function removeFavoriteAction(favoriteId: string) {
  const user = await requirePharmacy();
  await prisma.favoriteProduct.deleteMany({ where: { id: favoriteId, userId: user.id } });
  revalidateFavoriteViews();
}
