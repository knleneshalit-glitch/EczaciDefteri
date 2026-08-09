"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/session";
import { REGIONS } from "@/lib/regions";

export type AuthState = { error?: string } | undefined;

export async function registerAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const pharmacyName = String(formData.get("pharmacyName") ?? "").trim();
  const gln = String(formData.get("gln") ?? "").trim();
  const region = String(formData.get("region") ?? "");
  const district = String(formData.get("district") ?? "").trim();

  if (!email || !email.includes("@")) {
    return { error: "Geçerli bir e-posta girin." };
  }
  if (password.length < 8) {
    return { error: "Şifre en az 8 karakter olmalı." };
  }
  if (!pharmacyName) {
    return { error: "Eczane adı gerekli." };
  }
  if (!/^\d{13}$/.test(gln)) {
    return { error: "GLN numarası 13 haneli olmalı." };
  }
  if (!REGIONS.includes(region as (typeof REGIONS)[number])) {
    return { error: "Geçerli bir bölge seçin." };
  }

  const [existingEmail, existingGln] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { gln } }),
  ]);
  if (existingEmail) {
    return { error: "Bu e-posta ile zaten bir hesap var." };
  }
  if (existingGln) {
    return { error: "Bu GLN numarası ile zaten bir hesap var." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, pharmacyName, gln, region, district: district || null },
  });

  await createSession({ userId: user.id, email: user.email });
  redirect("/dashboard");
}

export async function loginAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "E-posta ve şifre gerekli." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "E-posta veya şifre hatalı." };
  }

  await createSession({ userId: user.id, email: user.email });
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
