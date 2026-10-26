"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
}
