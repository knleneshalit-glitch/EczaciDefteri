"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { REGIONS } from "@/lib/regions";

export type GroupState = { error?: string } | undefined;

export async function createGroupAction(
  _prevState: GroupState,
  formData: FormData
): Promise<GroupState> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const region = String(formData.get("region") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!name) return { error: "Grup adı gerekli." };
  if (!REGIONS.includes(region as (typeof REGIONS)[number])) {
    return { error: "Geçerli bir bölge seçin." };
  }

  const group = await prisma.group.create({
    data: {
      name,
      region,
      description: description || null,
      creatorId: user.id,
      members: {
        create: { userId: user.id, role: "MANAGER", status: "APPROVED" },
      },
    },
  });

  revalidatePath("/groups");
  redirect(`/groups/${group.id}`);
}

export async function requestJoinAction(groupId: string) {
  const user = await requireUser();

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId, userId: user.id } },
    update: {},
    create: { groupId, userId: user.id, role: "MEMBER", status: "PENDING" },
  });

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
}

export async function approveMemberAction(groupId: string, memberId: string) {
  const user = await requireUser();

  const managerMembership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (!managerMembership || managerMembership.role !== "MANAGER") {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  await prisma.groupMember.update({
    where: { id: memberId },
    data: { status: "APPROVED" },
  });

  revalidatePath(`/groups/${groupId}`);
}

export async function rejectMemberAction(groupId: string, memberId: string) {
  const user = await requireUser();

  const managerMembership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (!managerMembership || managerMembership.role !== "MANAGER") {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  await prisma.groupMember.update({
    where: { id: memberId },
    data: { status: "REJECTED" },
  });

  revalidatePath(`/groups/${groupId}`);
}
