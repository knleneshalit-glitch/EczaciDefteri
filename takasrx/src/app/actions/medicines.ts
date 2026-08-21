"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, requireSuperAdmin } from "@/lib/require-user";
import medicineSeed from "@/data/medicine-seed.json";

export async function searchMedicinesByNameAction(query: string) {
  await requireUser();
  const q = query.trim().toLocaleUpperCase("tr-TR");
  if (q.length < 2) return [];

  return prisma.medicine.findMany({
    where: { name: { contains: q } },
    orderBy: { name: "asc" },
    take: 8,
  });
}

export async function lookupMedicineByBarcodeAction(barkod: string) {
  await requireUser();
  const b = barkod.trim();
  if (b.length < 6) return null;

  return prisma.medicine.findUnique({ where: { barkod: b } });
}

export async function previousGroupListingsAction(
  groupId: string,
  medicineName: string,
  barkod: string
) {
  await requireUser();
  const name = medicineName.trim();
  const b = barkod.trim();
  if (!name && !b) return [];

  return prisma.listing.findMany({
    where: {
      groupId,
      OR: [
        ...(name ? [{ medicineName: name }] : []),
        ...(b ? [{ barkod: b }] : []),
      ],
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}

export type ImportMedicineState = { count?: number; error?: string } | undefined;

export async function importMedicineSeedAction(
  _prevState: ImportMedicineState
): Promise<ImportMedicineState> {
  await requireSuperAdmin();

  const seed = medicineSeed as { barkod: string; ad: string }[];
  const chunkSize = 50;
  for (let i = 0; i < seed.length; i += chunkSize) {
    const chunk = seed.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map((m) =>
        prisma.medicine.upsert({
          where: { barkod: m.barkod },
          update: { name: m.ad },
          create: { barkod: m.barkod, name: m.ad },
        })
      )
    );
  }

  return { count: seed.length };
}
