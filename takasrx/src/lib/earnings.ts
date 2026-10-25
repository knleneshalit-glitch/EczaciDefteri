import { prisma } from "@/lib/prisma";

export type EarningsSummary = {
  /** Depo fiyatıyla alınsaydı ödenecek tutar ile gruptan ödenen net tutar arasındaki fark. */
  alimKazanci: number;
  /** Alımlar depo fiyatından yapılsaydı ödenecek toplam. */
  alimDepoTutari: number;
  /** Gruptan yapılan alımların net toplamı. */
  alimTutari: number;
  alimAdedi: number;
  /** Satışlarınızdan nakde dönen tutar — rafta stoğa bağlı kalmayan para. */
  satisNakdi: number;
  /** Grup yükü (aylık valör/faiz) hareketlerinin toplamı; borçluysanız negatif olur. */
  valorGetirisi: number;
  /** Üye olduğunuz gruplardaki tüm eczanelerin alım kazançlarının toplamı. */
  grupKazanci: number;
};

export function emptyEarnings(): EarningsSummary {
  return {
    alimKazanci: 0,
    alimDepoTutari: 0,
    alimTutari: 0,
    alimAdedi: 0,
    satisNakdi: 0,
    valorGetirisi: 0,
    grupKazanci: 0,
  };
}

export function alimKazancYuzde(e: EarningsSummary) {
  return e.alimDepoTutari > 0 ? (e.alimKazanci / e.alimDepoTutari) * 100 : 0;
}

export function toplamKazanc(e: EarningsSummary) {
  return e.alimKazanci + e.valorGetirisi;
}

function purchaseSaving(entry: {
  amount: number;
  offer: { quantity: number; listing: { birimFiyat: number | null } } | null;
}) {
  const paid = Math.abs(entry.amount);
  const depoFiyati = entry.offer?.listing.birimFiyat;
  const depoTutari = depoFiyati != null && entry.offer ? depoFiyati * entry.offer.quantity : paid;
  return { paid, depoTutari, saving: Math.max(0, depoTutari - paid) };
}

/**
 * Bu ayın ve bu yılın kazanç özetini hesaplar. Alım/satış tarihi olarak
 * cari hesaba işlendiği an (teklifin kabul edildiği an) esas alınır.
 */
export async function getEarnings(
  userId: string,
  groupIds: string[],
  now = new Date()
): Promise<{ month: EarningsSummary; year: EarningsSummary }> {
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const offerInclude = {
    offer: { select: { quantity: true, listing: { select: { birimFiyat: true } } } },
  } as const;

  const [myTrades, myInterest, groupPurchases] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { userId, type: "TRADE", offerId: { not: null }, createdAt: { gte: yearStart } },
      select: { amount: true, createdAt: true, ...offerInclude },
    }),
    prisma.ledgerEntry.findMany({
      where: { userId, type: "INTEREST", interestDate: { gte: yearStart } },
      select: { amount: true, interestDate: true },
    }),
    groupIds.length
      ? prisma.ledgerEntry.findMany({
          where: {
            groupId: { in: groupIds },
            type: "TRADE",
            amount: { lt: 0 },
            offerId: { not: null },
            createdAt: { gte: yearStart },
          },
          select: { amount: true, createdAt: true, ...offerInclude },
        })
      : Promise.resolve([]),
  ]);

  const month = emptyEarnings();
  const year = emptyEarnings();

  for (const entry of myTrades) {
    const buckets = entry.createdAt >= monthStart ? [month, year] : [year];
    if (entry.amount < 0) {
      const { paid, depoTutari, saving } = purchaseSaving(entry);
      for (const b of buckets) {
        b.alimTutari += paid;
        b.alimDepoTutari += depoTutari;
        b.alimKazanci += saving;
        b.alimAdedi += entry.offer?.quantity ?? 0;
      }
    } else {
      for (const b of buckets) b.satisNakdi += entry.amount;
    }
  }

  for (const entry of myInterest) {
    const buckets = entry.interestDate && entry.interestDate >= monthStart ? [month, year] : [year];
    for (const b of buckets) b.valorGetirisi += entry.amount;
  }

  for (const entry of groupPurchases) {
    const buckets = entry.createdAt >= monthStart ? [month, year] : [year];
    const { saving } = purchaseSaving(entry);
    for (const b of buckets) b.grupKazanci += saving;
  }

  return { month, year };
}
