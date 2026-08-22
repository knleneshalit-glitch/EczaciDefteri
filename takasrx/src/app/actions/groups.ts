"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { REGIONS } from "@/lib/regions";
import { createNotification } from "@/lib/notifications";

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

  // TakasRX Admin hesabı (varsa) her yeni kurulan gruba otomatik olarak
  // ikinci yönetici olarak eklenir.
  const systemAdminEmail = (process.env.SYSTEM_ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (systemAdminEmail) {
    const systemAdmin = await prisma.user.findUnique({ where: { email: systemAdminEmail } });
    if (systemAdmin && systemAdmin.id !== user.id) {
      await prisma.groupMember.create({
        data: { groupId: group.id, userId: systemAdmin.id, role: "MANAGER", status: "APPROVED" },
      });
    }
  }

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

async function requireManager(groupId: string) {
  const user = await requireUser();
  if (user.isSuperAdmin) return user;

  const managerMembership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (!managerMembership || managerMembership.role !== "MANAGER" || managerMembership.status !== "APPROVED") {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
  return user;
}

export async function approveMemberAction(groupId: string, memberId: string) {
  await requireManager(groupId);

  await prisma.groupMember.update({
    where: { id: memberId },
    data: { status: "APPROVED" },
  });

  revalidatePath(`/groups/${groupId}`);
}

export async function rejectMemberAction(groupId: string, memberId: string) {
  await requireManager(groupId);

  await prisma.groupMember.update({
    where: { id: memberId },
    data: { status: "REJECTED" },
  });

  revalidatePath(`/groups/${groupId}`);
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
    data: { monthlyInterestRate: percent / 100 },
  });

  revalidatePath(`/groups/${groupId}/balances`);
}

export async function toggleInterestEnabledAction(groupId: string) {
  await requireManager(groupId);

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { interestEnabled: true } });
  if (!group) throw new Error("Grup bulunamadı.");

  await prisma.group.update({
    where: { id: groupId },
    data: { interestEnabled: !group.interestEnabled },
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

export async function addManualBalanceAction(
  groupId: string,
  _prevState: GroupState,
  formData: FormData
): Promise<GroupState> {
  await requireManager(groupId);

  const userId = String(formData.get("userId") ?? "");
  const amount = Number(String(formData.get("amount") ?? "").trim().replace(",", "."));
  const note = String(formData.get("note") ?? "").trim();

  if (!Number.isFinite(amount) || amount === 0) {
    return { error: "Geçerli (sıfırdan farklı) bir tutar girin." };
  }

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership || membership.status !== "APPROVED") {
    return { error: "Üye bulunamadı." };
  }

  await prisma.ledgerEntry.create({
    data: {
      groupId,
      userId,
      type: "MANUAL",
      amount,
      note: note || "Admin bakiye düzeltmesi",
    },
  });

  await createNotification({
    userId,
    message: `Bakiyenize ${amount > 0 ? "+" : ""}${amount.toFixed(2)} ₺ manuel düzeltme işlendi.`,
    link: `/groups/${groupId}/balances`,
  });

  revalidatePath(`/groups/${groupId}/balances`);
}

export async function yearEndSettlementAction(groupId: string) {
  await requireManager(groupId);

  const members = await prisma.groupMember.findMany({
    where: { groupId, status: "APPROVED" },
    select: { userId: true },
  });

  const now = new Date();
  const settlements = await Promise.all(
    members.map(async ({ userId }) => {
      const sum = await prisma.ledgerEntry.aggregate({
        where: { groupId, userId, type: "INTEREST", createdAt: { lte: now } },
        _sum: { amount: true },
      });
      return { userId, amount: sum._sum.amount ?? 0 };
    })
  );

  const ops: Prisma.PrismaPromise<unknown>[] = settlements
    .filter((s) => Math.abs(s.amount) > 0.0001)
    .map((s) =>
      prisma.ledgerEntry.create({
        data: {
          groupId,
          userId: s.userId,
          type: "MANUAL",
          amount: s.amount,
          note: "Yıl sonu grup yükü mahsuplaşması",
        },
      })
    );

  ops.push(
    prisma.group.update({
      where: { id: groupId },
      data: { grupYukuResetAt: now },
    })
  );

  await prisma.$transaction(ops);

  revalidatePath(`/groups/${groupId}/balances`);
}
