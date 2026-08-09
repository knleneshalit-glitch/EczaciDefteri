"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePharmacy } from "@/lib/require-user";

export type CourierAssignState = { error?: string } | undefined;

export async function assignCourierAction(
  _prevState: CourierAssignState,
  formData: FormData
): Promise<CourierAssignState> {
  const pharmacy = await requirePharmacy();
  const email = String(formData.get("courierEmail") ?? "").trim().toLowerCase();

  if (!email) return { error: "E-posta gerekli." };

  const courier = await prisma.user.findUnique({ where: { email } });
  if (!courier || courier.accountType !== "COURIER") {
    return { error: "Bu e-postayla kayıtlı bir sevkiyatçı bulunamadı." };
  }

  await prisma.courierAssignment.upsert({
    where: { courierId_pharmacyId: { courierId: courier.id, pharmacyId: pharmacy.id } },
    update: {},
    create: { courierId: courier.id, pharmacyId: pharmacy.id },
  });

  revalidatePath("/couriers");
}

export async function removeCourierAssignmentAction(assignmentId: string) {
  const pharmacy = await requirePharmacy();

  await prisma.courierAssignment.deleteMany({
    where: { id: assignmentId, pharmacyId: pharmacy.id },
  });

  revalidatePath("/couriers");
}
