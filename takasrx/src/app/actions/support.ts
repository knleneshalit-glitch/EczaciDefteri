"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireSuperAdmin } from "@/lib/require-user";
import { createNotification } from "@/lib/notifications";

export type SupportState = { error?: string; success?: string } | undefined;

export async function createSupportTicketAction(_prevState: SupportState, formData: FormData): Promise<SupportState> {
  const user = await requireUser();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!subject) return { error: "Konu gerekli." };
  if (body.length < 10) return { error: "Lütfen sorununuzu en az 10 karakterle açıklayın." };
  if (subject.length > 120 || body.length > 3000) return { error: "Mesaj çok uzun." };

  await prisma.supportTicket.create({ data: { userId: user.id, subject, body } });

  const admins = await prisma.user.findMany({ where: { isSuperAdmin: true }, select: { id: true } });
  await Promise.all(
    admins.map((a) =>
      createNotification({
        userId: a.id,
        message: `Yeni destek talebi (${user.pharmacyName ?? user.contactName}): ${subject}`,
        link: "/admin#destek",
      })
    )
  );

  revalidatePath("/support");
  revalidatePath("/admin");
  return { success: "Destek talebiniz iletildi. TakasRX ekibi en kısa sürede yanıtlayacak." };
}

/** TakasRX ekibi (süper admin) destek talebini yanıtlar. */
export async function replySupportTicketAction(ticketId: string, formData: FormData) {
  await requireSuperAdmin();
  const reply = String(formData.get("reply") ?? "").trim();
  if (!reply) throw new Error("Yanıt boş olamaz.");

  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { adminReply: reply, status: "ANSWERED", repliedAt: new Date() },
  });
  await createNotification({
    userId: ticket.userId,
    message: `Destek talebiniz yanıtlandı: ${ticket.subject}`,
    link: "/support",
  });

  revalidatePath("/support");
  revalidatePath("/admin");
}

export async function closeSupportTicketAction(ticketId: string) {
  const user = await requireUser();
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket || (ticket.userId !== user.id && !user.isSuperAdmin)) {
    throw new Error("Bu destek talebine erişiminiz yok.");
  }

  await prisma.supportTicket.update({ where: { id: ticketId }, data: { status: "CLOSED" } });

  revalidatePath("/support");
  revalidatePath("/admin");
}
