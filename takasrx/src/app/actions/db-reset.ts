"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export type DbResetState = { error?: string; success?: string } | undefined;

function safeEqual(a: string, b: string) {
  const bufA = crypto.createHash("sha256").update(a).digest();
  const bufB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function resetDatabaseAndSeedTestAccountsAction(
  _prevState: DbResetState,
  formData: FormData
): Promise<DbResetState> {
  const secret = String(formData.get("secret") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  const resetSecret = process.env.DB_RESET_SECRET ?? "";
  if (!resetSecret) {
    return { error: "Sıfırlama özelliği aktif değil. Vercel'de DB_RESET_SECRET tanımlanmamış." };
  }
  if (!secret || !safeEqual(secret, resetSecret)) {
    return { error: "Sıfırlama anahtarı hatalı." };
  }
  if (confirmation !== "SIFIRLA") {
    return { error: "Onay metnini tam olarak SIFIRLA yazmalısınız." };
  }

  // Bağımlılık sırasına göre (önce çocuk tablolar) tüm verileri sil.
  await prisma.$transaction([
    prisma.needResponse.deleteMany(),
    prisma.ledgerEntry.deleteMany(),
    prisma.shipment.deleteMany(),
    prisma.needRequest.deleteMany(),
    prisma.offer.deleteMany(),
    prisma.listing.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.courierAssignment.deleteMany(),
    prisma.groupMember.deleteMany(),
    prisma.announcement.deleteMany(),
    prisma.group.deleteMany(),
    prisma.medicine.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash("123456", 12);
  const accounts = Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    return {
      email: `denemehesabi${n}@gmail.com`,
      passwordHash,
      accountType: "PHARMACY" as const,
      pharmacyName: `Deneme Hesabı ${n}`,
      contactName: `Deneme Hesabı ${n}`,
      gln: `100000000${String(n).padStart(4, "0")}`,
      region: "İstanbul",
      isSuperAdmin: false,
    };
  });

  await prisma.user.createMany({ data: accounts });

  return {
    success: `Veritabanı tamamen sıfırlandı ve denemehesabi1@gmail.com – denemehesabi10@gmail.com (şifre: 123456) hesapları oluşturuldu.`,
  };
}
