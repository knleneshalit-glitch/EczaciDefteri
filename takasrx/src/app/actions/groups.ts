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

export async function myApprovedGroupsAction() {
  const user = await requireUser();

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id, status: "APPROVED" },
    include: { group: { select: { id: true, name: true, closedAt: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return memberships
    .filter((m) => !m.group.closedAt)
    .map((m) => ({ id: m.group.id, name: m.group.name }));
}

export async function groupApprovedPharmaciesAction(groupId: string) {
  const user = await requireUser();

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (!membership || membership.status !== "APPROVED") return [];

  const members = await prisma.groupMember.findMany({
    where: { groupId, status: "APPROVED", userId: { not: user.id } },
    include: { user: { select: { id: true, pharmacyName: true, contactName: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return members.map((m) => ({
    id: m.user.id,
    pharmacyName: m.user.pharmacyName ?? m.user.contactName,
  }));
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

  const member = await prisma.groupMember.update({
    where: { id: memberId },
    data: { status: "APPROVED" },
    include: { group: { select: { name: true } } },
  });
  await createNotification({
    userId: member.userId,
    message: `"${member.group.name}" grubuna katılım isteğiniz onaylandı.`,
    link: `/groups/${groupId}`,
  });

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
}

export async function rejectMemberAction(groupId: string, memberId: string) {
  await requireManager(groupId);

  await prisma.groupMember.update({
    where: { id: memberId },
    data: { status: "REJECTED" },
  });

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
}

/** Grup yöneticisi bir üyeyi yönetici yapar ya da yöneticiliğini kaldırır. */
export async function setMemberRoleAction(groupId: string, memberId: string, role: "MEMBER" | "MANAGER") {
  await requireManager(groupId);

  const [group, target] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId } }),
    prisma.groupMember.findUnique({ where: { id: memberId } }),
  ]);
  if (!group || !target || target.groupId !== groupId || target.status !== "APPROVED") {
    throw new Error("Üye bulunamadı.");
  }
  if (role === "MEMBER" && target.userId === group.creatorId) {
    throw new Error("Grubu kuran eczanenin yöneticiliği kaldırılamaz.");
  }

  await prisma.groupMember.update({ where: { id: memberId }, data: { role } });
  await createNotification({
    userId: target.userId,
    message:
      role === "MANAGER"
        ? `"${group.name}" grubunda grup yöneticisi yapıldınız.`
        : `"${group.name}" grubundaki yöneticiliğiniz kaldırıldı.`,
    link: `/groups/${groupId}`,
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}/members`);
}

/** Üye kendi isteğiyle gruptan ayrılır (cari bakiyesi sıfırsa). */
export async function leaveGroupAction(groupId: string) {
  const user = await requireUser();

  const [group, membership] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId } }),
    prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: user.id } } }),
  ]);
  if (!group || !membership) throw new Error("Bu grubun üyesi değilsiniz.");
  if (group.creatorId === user.id) throw new Error("Grubu kuran eczane gruptan ayrılamaz.");

  const balance = await prisma.ledgerEntry.aggregate({
    where: { groupId, userId: user.id },
    _sum: { amount: true },
  });
  if (Math.abs(balance._sum.amount ?? 0) > 0.01) {
    throw new Error("Cari bakiyeniz sıfırlanmadan gruptan ayrılamazsınız.");
  }

  await prisma.groupMember.delete({ where: { id: membership.id } });

  revalidatePath("/groups");
  redirect("/groups");
}

export async function updateBalanceLimitAction(
  groupId: string,
  _prevState: GroupState,
  formData: FormData
): Promise<GroupState> {
  await requireManager(groupId);

  const enabled = formData.get("balanceLimitEnabled") === "on";
  const raw = String(formData.get("balanceLimit") ?? "").trim().replace(",", ".");
  const limit = raw ? Number(raw) : null;
  if (enabled && (limit == null || !Number.isFinite(limit) || limit < 0)) {
    return { error: "Bakiye kısıtlaması için 0 veya daha büyük bir borç limiti girin." };
  }

  await prisma.group.update({
    where: { id: groupId },
    data: { balanceLimitEnabled: enabled, balanceLimit: limit },
  });

  revalidatePath(`/groups/${groupId}/balances`);
  revalidatePath("/groups");
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
  revalidatePath("/groups");
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
