"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { requireApprovedMember } from "@/lib/group-access";
import { recordTrade } from "@/lib/ledger";
import { createNotification } from "@/lib/notifications";

export type NeedState = { error?: string } | undefined;

function numberOrNull(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function createNeedAction(
  groupId: string,
  _prevState: NeedState,
  formData: FormData
): Promise<NeedState> {
  const user = await requireUser();
  await requireApprovedMember(groupId, user);

  const title = String(formData.get("title") ?? "").trim();
  const medicineName = String(formData.get("medicineName") ?? "").trim();
  const barkod = String(formData.get("barkod") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const quantity = numberOrNull(formData.get("quantity"));

  if (!title) return { error: "Başlık gerekli." };
  if (!medicineName) return { error: "İlaç adı gerekli." };

  const need = await prisma.needRequest.create({
    data: {
      groupId,
      userId: user.id,
      title,
      medicineName,
      barkod: barkod || null,
      quantity,
      description: description || null,
    },
  });

  revalidatePath(`/groups/${groupId}/needs`);
  redirect(`/groups/${groupId}/needs/${need.id}`);
}

export async function respondNeedAction(groupId: string, needId: string, formData: FormData) {
  const user = await requireUser();
  await requireApprovedMember(groupId, user);

  const need = await prisma.needRequest.findUnique({ where: { id: needId } });
  if (!need || need.groupId !== groupId) {
    throw new Error("İhtiyaç bildirimi bulunamadı.");
  }
  if (need.userId === user.id) {
    throw new Error("Kendi ihtiyacınıza teklif veremezsiniz.");
  }

  const quantity = Math.max(1, Math.round(numberOrNull(formData.get("quantity")) ?? 1));
  const unitPrice = numberOrNull(formData.get("unitPrice"));
  const message = String(formData.get("message") ?? "").trim();

  await prisma.needResponse.create({
    data: {
      needRequestId: needId,
      userId: user.id,
      quantity,
      unitPrice,
      totalPrice: unitPrice != null ? unitPrice * quantity : null,
      message: message || null,
    },
  });

  await createNotification({
    userId: need.userId,
    message: `${user.pharmacyName ?? user.contactName} "${need.title}" ihtiyacınıza teklif verdi.`,
    link: `/groups/${groupId}/needs/${needId}`,
  });

  revalidatePath(`/groups/${groupId}/needs/${needId}`);
}

export async function acceptNeedResponseAction(
  groupId: string,
  needId: string,
  responseId: string
) {
  const user = await requireUser();

  const need = await prisma.needRequest.findUnique({ where: { id: needId } });
  if (!need || need.groupId !== groupId || need.userId !== user.id) {
    throw new Error("Bu ihtiyaç bildirimine ait değilsiniz.");
  }

  const response = await prisma.needResponse.findUnique({ where: { id: responseId } });
  if (!response || response.needRequestId !== needId || response.status !== "PENDING") {
    throw new Error("Geçersiz teklif.");
  }

  await prisma.$transaction([
    prisma.needResponse.update({ where: { id: responseId }, data: { status: "ACCEPTED" } }),
    prisma.needResponse.updateMany({
      where: { needRequestId: needId, id: { not: responseId }, status: "PENDING" },
      data: { status: "REJECTED" },
    }),
    prisma.needRequest.update({ where: { id: needId }, data: { status: "FULFILLED" } }),
  ]);

  if (response.totalPrice && response.totalPrice > 0) {
    await recordTrade({
      groupId,
      buyerId: need.userId,
      sellerId: response.userId,
      amount: response.totalPrice,
      note: `${need.title} (${response.quantity} adet)`,
    });
  }

  await createNotification({
    userId: response.userId,
    message: `Teklifiniz kabul edildi: ${need.title}.`,
    link: `/groups/${groupId}/needs/${needId}`,
  });

  revalidatePath(`/groups/${groupId}/needs/${needId}`);
  revalidatePath(`/groups/${groupId}/balances`);
}

export async function rejectNeedResponseAction(
  groupId: string,
  needId: string,
  responseId: string
) {
  const user = await requireUser();

  const need = await prisma.needRequest.findUnique({ where: { id: needId } });
  if (!need || need.groupId !== groupId || need.userId !== user.id) {
    throw new Error("Bu ihtiyaç bildirimine ait değilsiniz.");
  }

  const response = await prisma.needResponse.findUnique({ where: { id: responseId } });
  if (!response || response.needRequestId !== needId || response.status !== "PENDING") {
    throw new Error("Geçersiz teklif.");
  }

  await prisma.needResponse.update({ where: { id: responseId }, data: { status: "REJECTED" } });

  await createNotification({
    userId: response.userId,
    message: `Teklifiniz reddedildi: ${need.title}.`,
    link: `/groups/${groupId}/needs/${needId}`,
  });

  revalidatePath(`/groups/${groupId}/needs/${needId}`);
}

export async function closeNeedAction(groupId: string, needId: string) {
  const user = await requireUser();

  const need = await prisma.needRequest.findUnique({ where: { id: needId } });
  if (!need || need.groupId !== groupId || need.userId !== user.id) {
    throw new Error("Bu ihtiyaç bildirimine ait değilsiniz.");
  }

  await prisma.needRequest.update({ where: { id: needId }, data: { status: "CLOSED" } });

  revalidatePath(`/groups/${groupId}/needs/${needId}`);
  revalidatePath(`/groups/${groupId}/needs`);
}
