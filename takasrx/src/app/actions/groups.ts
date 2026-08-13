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

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group || group.closedAt) {
    throw new Error("Bu grup kapatıldığı için katılım kabul edilmiyor.");
  }

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

async function requireManager(groupId: string) {
  const user = await requireUser();
  const managerMembership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (!managerMembership || managerMembership.role !== "MANAGER" || managerMembership.status !== "APPROVED") {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
  return user;
}

export async function removeMemberAction(groupId: string, memberId: string) {
  const user = await requireManager(groupId);

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  const target = await prisma.groupMember.findUnique({ where: { id: memberId } });
  if (!group || !target || target.groupId !== groupId) {
    throw new Error("Üye bulunamadı.");
  }
  if (target.userId === group.creatorId) {
    throw new Error("Grubu kuran eczane gruptan çıkarılamaz.");
  }
  if (target.userId === user.id) {
    throw new Error("Kendinizi gruptan çıkaramazsınız.");
  }

  await prisma.groupMember.delete({ where: { id: memberId } });

  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/members`);
}

export async function closeGroupAction(groupId: string) {
  await requireManager(groupId);

  await prisma.group.update({
    where: { id: groupId },
    data: { closedAt: new Date() },
  });

  revalidatePath(`/groups/${groupId}`);
}

export async function updateInterestRateAction(
  groupId: string,
  _prevState: GroupState,
  formData: FormData
): Promise<GroupState> {
  await requireManager(groupId);

  const percent = Number(String(formData.get("ratePercent") ?? "").trim().replace(",", "."));
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    return { error: "Geçerli bir oran girin (0-100 arası)." };
  }

  await prisma.group.update({
    where: { id: groupId },
    data: { dailyInterestRate: percent / 100 },
  });

  revalidatePath(`/groups/${groupId}/balances`);
}

export async function reopenGroupAction(groupId: string) {
  await requireManager(groupId);

  await prisma.group.update({
    where: { id: groupId },
    data: { closedAt: null },
  });

  revalidatePath(`/groups/${groupId}`);
}
