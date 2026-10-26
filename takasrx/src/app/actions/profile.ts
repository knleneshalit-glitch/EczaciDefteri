"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { REGIONS } from "@/lib/regions";
import { normalizePhone } from "@/lib/phone";

export type ProfileState = { error?: string; success?: string } | undefined;

export async function updateProfileAction(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await requireUser();

  const contactName = String(formData.get("contactName") ?? "").trim();
  const pharmacyName = String(formData.get("pharmacyName") ?? "").trim();
  const region = String(formData.get("region") ?? "");
  const district = String(formData.get("district") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));

  if (!contactName) return { error: "Yetkili adı soyadı gerekli." };
  if (phone === "invalid") return { error: "Geçerli bir telefon numarası girin (ör. 0532 123 45 67)." };
  if (user.accountType === "COURIER" && !phone) {
    return { error: "Sevkiyatçı hesabında telefon numarası zorunludur." };
  }
  if (!REGIONS.includes(region as (typeof REGIONS)[number])) {
    return { error: "Geçerli bir bölge seçin." };
  }
  if (user.accountType === "PHARMACY" && !pharmacyName) {
    return { error: "Eczane adı gerekli." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      contactName,
      region,
      district: district || null,
      address: address || null,
      phone,
      ...(user.accountType === "PHARMACY" ? { pharmacyName } : {}),
    },
  });

  revalidatePath("/profile");
  revalidatePath("/courier/profile");
  return { success: "Bilgileriniz güncellendi." };
}

export async function changePasswordAction(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await requireUser();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const fullUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await bcrypt.compare(currentPassword, fullUser.passwordHash))) {
    return { error: "Mevcut şifreniz hatalı." };
  }
  if (newPassword.length < 8) {
    return { error: "Yeni şifre en az 8 karakter olmalı." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Yeni şifreler eşleşmiyor." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  revalidatePath("/profile");
  return { success: "Şifreniz güncellendi." };
}
