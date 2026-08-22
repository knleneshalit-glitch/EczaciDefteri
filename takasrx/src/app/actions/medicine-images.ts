"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePharmacy, requireSuperAdmin } from "@/lib/require-user";

export type MedicineImageState = { error?: string; success?: string } | undefined;

const MAX_DATA_URL_LENGTH = 700_000; // ~500KB kaynak görsel için taban64 payload sınırı

export async function submitMedicineImageAction(
  barkod: string,
  _prevState: MedicineImageState,
  formData: FormData
): Promise<MedicineImageState> {
  const user = await requirePharmacy();

  const dataUrl = String(formData.get("dataUrl") ?? "").trim();
  if (!barkod.trim()) return { error: "Barkod bilgisi bulunamadı." };
  if (!dataUrl.startsWith("data:image/")) return { error: "Geçersiz görsel." };
  if (dataUrl.length > MAX_DATA_URL_LENGTH) return { error: "Görsel çok büyük. Daha küçük bir fotoğraf deneyin." };

  await prisma.medicineImage.create({
    data: { barkod: barkod.trim(), userId: user.id, dataUrl },
  });

  revalidatePath("/admin");
  return { success: "Fotoğrafınız gönderildi, TakasRX admin onayından sonra görünecek." };
}

export async function approveMedicineImageAction(imageId: string) {
  await requireSuperAdmin();

  const image = await prisma.medicineImage.findUnique({ where: { id: imageId } });
  if (!image) throw new Error("Görsel bulunamadı.");

  await prisma.$transaction([
    prisma.medicineImage.updateMany({
      where: { barkod: image.barkod, status: "APPROVED", id: { not: imageId } },
      data: { status: "REJECTED" },
    }),
    prisma.medicineImage.update({ where: { id: imageId }, data: { status: "APPROVED" } }),
  ]);

  revalidatePath("/admin");
}

export async function rejectMedicineImageAction(imageId: string) {
  await requireSuperAdmin();

  await prisma.medicineImage.update({ where: { id: imageId }, data: { status: "REJECTED" } });

  revalidatePath("/admin");
}
