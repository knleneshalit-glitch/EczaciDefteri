import { prisma } from "@/lib/prisma";

function startOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonths(d: Date, months: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
}

/** Alım/satış tutarını cari hesaba işler: alıcının bakiyesinden düşer, satıcının bakiyesine eklenir. */
export async function recordTrade(params: {
  groupId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  offerId?: string;
  note?: string;
}) {
  const { groupId, buyerId, sellerId, amount, offerId, note } = params;

  await prisma.$transaction([
    prisma.ledgerEntry.create({
      data: {
        groupId,
        userId: buyerId,
        type: "TRADE",
        amount: -Math.abs(amount),
        offerId,
        note: note ?? "Alım",
      },
    }),
    prisma.ledgerEntry.create({
      data: {
        groupId,
        userId: sellerId,
        type: "TRADE",
        amount: Math.abs(amount),
        offerId,
        note: note ?? "Satış",
      },
    }),
  ]);
}

const MAX_BACKFILL_MONTHS = 36;

/**
 * Grubun onaylı üyeleri için işlenmemiş ayların faizini hesaplayıp
 * LedgerEntry(type: INTEREST) olarak kaydeder. Faiz aylık olarak, her ayın
 * 1'ine, o ana kadarki bakiyeye (sadece TRADE/MANUAL hareketlerin toplamı)
 * göre hesaplanır ve birikimi ayrı bir "grup yükü" başlığında tutulur
 * (bakiyeye karışmaz, kendi üzerine faiz işlemez).
 */
export async function accrueInterestForGroup(groupId: string) {
  const [group, members] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId }, select: { monthlyInterestRate: true } }),
    prisma.groupMember.findMany({
      where: { groupId, status: "APPROVED" },
      select: { userId: true },
    }),
  ]);
  if (!group) return;
  const monthlyInterestRate = group.monthlyInterestRate;

  const thisMonthStart = startOfMonth(new Date());

  for (const { userId } of members) {
    const [principalEntries, lastInterest] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where: { groupId, userId, type: { in: ["TRADE", "MANUAL"] } },
        orderBy: { createdAt: "asc" },
        select: { amount: true, createdAt: true },
      }),
      prisma.ledgerEntry.findFirst({
        where: { groupId, userId, type: "INTEREST" },
        orderBy: { interestDate: "desc" },
        select: { interestDate: true },
      }),
    ]);

    if (principalEntries.length === 0) continue;

    const firstEntryMonth = startOfMonth(principalEntries[0].createdAt);
    let cursor = lastInterest?.interestDate
      ? addMonths(startOfMonth(lastInterest.interestDate), 1)
      : firstEntryMonth;

    const earliestAllowed = addMonths(thisMonthStart, -MAX_BACKFILL_MONTHS);
    if (cursor < earliestAllowed) cursor = earliestAllowed;

    const newEntries: { groupId: string; userId: string; type: "INTEREST"; amount: number; interestDate: Date }[] = [];

    while (cursor <= thisMonthStart) {
      const principal = principalEntries
        .filter((e) => e.createdAt < cursor)
        .reduce((sum, e) => sum + e.amount, 0);

      const interest = principal * monthlyInterestRate;
      if (Math.abs(interest) > 0.0001) {
        newEntries.push({
          groupId,
          userId,
          type: "INTEREST",
          amount: interest,
          interestDate: new Date(cursor),
        });
      }
      cursor = addMonths(cursor, 1);
    }

    if (newEntries.length > 0) {
      await prisma.ledgerEntry.createMany({ data: newEntries });
    }
  }
}

export type MemberBalance = {
  userId: string;
  bakiye: number;
  grupYuku: number;
  toplam: number;
};

export async function getGroupBalances(groupId: string): Promise<MemberBalance[]> {
  const entries = await prisma.ledgerEntry.findMany({
    where: { groupId },
    select: { userId: true, type: true, amount: true },
  });

  const byUser = new Map<string, { bakiye: number; grupYuku: number }>();
  for (const e of entries) {
    const bucket = byUser.get(e.userId) ?? { bakiye: 0, grupYuku: 0 };
    if (e.type === "INTEREST") bucket.grupYuku += e.amount;
    else bucket.bakiye += e.amount;
    byUser.set(e.userId, bucket);
  }

  return Array.from(byUser.entries()).map(([userId, v]) => ({
    userId,
    bakiye: v.bakiye,
    grupYuku: v.grupYuku,
    toplam: v.bakiye + v.grupYuku,
  }));
}
