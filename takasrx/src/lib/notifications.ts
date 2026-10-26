import { prisma } from "@/lib/prisma";

export async function createNotification(params: {
  userId: string;
  message: string;
  link?: string;
}) {
  await prisma.notification.create({
    data: { userId: params.userId, message: params.message, link: params.link ?? null },
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}
