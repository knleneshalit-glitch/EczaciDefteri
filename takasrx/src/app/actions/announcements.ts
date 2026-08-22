"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-user";

export type AnnouncementState = { error?: string } | undefined;

export async function createAnnouncementAction(
  _prevState: AnnouncementState,
  formData: FormData
): Promise<AnnouncementState> {
  const admin = await requireSuperAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!title) return { error: "Başlık gerekli." };
  if (!body) return { error: "Duyuru metni gerekli." };

  await prisma.announcement.create({
    data: { title, body, authorId: admin.id },
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

export async function deactivateAnnouncementAction(announcementId: string) {
  await requireSuperAdmin();

  await prisma.announcement.update({
    where: { id: announcementId },
    data: { active: false },
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin");
}
