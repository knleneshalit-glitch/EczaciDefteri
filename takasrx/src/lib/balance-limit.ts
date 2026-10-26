import { prisma } from "@/lib/prisma";

/**
 * Grupta bakiye kısıtlaması açıksa, üyenin cari toplamı (bakiye + grup yükü)
 * eksi bekleyen tekliflerinin tutarı, yeni alımla birlikte borç limitinin
 * altına düşüyorsa alımı engeller.
 */
export async function assertWithinBalanceLimit(params: {
  groupId: string;
  userId: string;
  amount: number;
  excludeOfferId?: string;
}) {
  const { groupId, userId, amount, excludeOfferId } = params;
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { balanceLimitEnabled: true, balanceLimit: true },
  });
  if (!group?.balanceLimitEnabled || group.balanceLimit == null) return;

  const [ledger, pending] = await Promise.all([
    prisma.ledgerEntry.aggregate({ where: { groupId, userId }, _sum: { amount: true } }),
    prisma.offer.aggregate({
      where: {
        userId,
        status: "PENDING",
        listing: { groupId },
        ...(excludeOfferId ? { id: { not: excludeOfferId } } : {}),
      },
      _sum: { totalPrice: true },
    }),
  ]);

  const available = (ledger._sum.amount ?? 0) - (pending._sum.totalPrice ?? 0);
  if (available - amount < -group.balanceLimit) {
    throw new Error(
      `Grubun bakiye kısıtlaması nedeniyle bu alım yapılamıyor. Borç limiti ${group.balanceLimit.toFixed(2)} ₺; ` +
        `bekleyen teklifleriniz dahil cari durumunuz ${available.toFixed(2)} ₺. Önce bakiyenizi kapatın ya da daha az adet deneyin.`
    );
  }
}
