import { prisma } from "@/lib/prisma";
import { DAILY_INTEREST_RATE } from "@/lib/settings";

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date) {
  const copy = new Date(d);
  copy.setUTCHours(23, 59, 59, 999);
  return copy;
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
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

const MAX_BACKFILL_DAYS = 90;

/**
 * Grubun onaylı üyeleri için işlenmemiş günlerin faizini hesaplayıp
 * LedgerEntry(type: INTEREST) olarak kaydeder. Faiz, o günkü bakiyeye
 * (sadece TRADE/MANUAL hareketlerin toplamı) göre hesaplanır ve birikimi
 * ayrı bir "grup yükü" başlığında tutulur (bakiyeye karışmaz).
 */
export async function accrueInterestForGroup(groupId: string) {
  const members = await prisma.groupMember.findMany({
    where: { groupId, status: "APPROVED" },
    select: { userId: true },
  });

  const today = startOfDay(new Date());

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

    const firstEntryDay = startOfDay(principalEntries[0].createdAt);
    let cursor = lastInterest?.interestDate
      ? addDays(startOfDay(lastInterest.interestDate), 1)
      : firstEntryDay;

    const earliestAllowed = addDays(today, -MAX_BACKFILL_DAYS);
    if (cursor < earliestAllowed) cursor = earliestAllowed;

    const newEntries: { groupId: string; userId: string; type: "INTEREST"; amount: number; interestDate: Date }[] = [];

    while (cursor < today) {
      const dayEnd = endOfDay(cursor);
      const principal = principalEntries
        .filter((e) => e.createdAt <= dayEnd)
        .reduce((sum, e) => sum + e.amount, 0);

      const interest = principal * DAILY_INTEREST_RATE;
      if (Math.abs(interest) > 0.0001) {
        newEntries.push({
          groupId,
          userId,
          type: "INTEREST",
          amount: interest,
          interestDate: new Date(cursor),
        });
      }
      cursor = addDays(cursor, 1);
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
