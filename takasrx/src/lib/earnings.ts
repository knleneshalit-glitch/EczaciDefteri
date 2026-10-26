import { prisma } from "@/lib/prisma";

export type EarningsSummary = {
  /** Depo fiyatıyla alınsaydı ödenecek tutar ile gruptan ödenen net tutar arasındaki fark. */
  alimKazanci: number;
  /** Yüzde hesabına giren (iskontolu/MF'li) alımların depo fiyatıyla tutarı. */
  kazancliAlimDepoTutari: number;
  /** Gruptan yapılan alımların net toplamı (Benim Toplam Alımım). */
  alimTutari: number;
  alimAdedi: number;
  /**
   * Stoğa bağlanmayan nakit: aynı fiyatı tek başına yakalamak için depo
   * şartının tamamını (ör. 1000+350) almanız gerekirdi; ihtiyacınız kadar
   * alarak rafa bağlamadığınız tutar.
   */
  stogaBaglanmayanNakit: number;
  /** Stoğa bağlanmayan nakdin grubun aylık faiz oranıyla bir aylık finansman değeri. */
  valorKazanci: number;
  /** Gruplarınızdaki tüm alımların kazancı (Grubumun Kazancı). */
  grupKazanci: number;
  grupKazancliDepoTutari: number;
  grupToplamAlim: number;
  grupValorKazanci: number;
};

export function emptyEarnings(): EarningsSummary {
  return {
    alimKazanci: 0,
    kazancliAlimDepoTutari: 0,
    alimTutari: 0,
    alimAdedi: 0,
    stogaBaglanmayanNakit: 0,
    valorKazanci: 0,
    grupKazanci: 0,
    grupKazancliDepoTutari: 0,
    grupToplamAlim: 0,
    grupValorKazanci: 0,
  };
}

export function alimKazancYuzde(e: EarningsSummary) {
  return e.kazancliAlimDepoTutari > 0 ? (e.alimKazanci / e.kazancliAlimDepoTutari) * 100 : 0;
}

export function grupKazancYuzde(e: EarningsSummary) {
  return e.grupKazancliDepoTutari > 0 ? (e.grupKazanci / e.grupKazancliDepoTutari) * 100 : 0;
}

export function toplamKazanc(e: EarningsSummary) {
  return e.alimKazanci + e.valorKazanci;
}

type PurchaseEntry = {
  amount: number;
  offer: {
    quantity: number;
    listing: {
      birimFiyat: number | null;
      totalStock: number | null;
      medicineName: string;
      group: { monthlyInterestRate: number };
    };
  } | null;
};

/**
 * Tek bir alımın kazanç kalemleri. İskonto/MF içermeyen tekliflerden
 * yapılan alımlar ve Bakiye Transferi yüzdelik kazanca ve valöre yansımaz.
 */
export function analyzePurchase(entry: PurchaseEntry) {
  const paid = Math.abs(entry.amount);
  const listing = entry.offer?.listing;
  const quantity = entry.offer?.quantity ?? 0;
  if (!listing || quantity <= 0) {
    return { paid, quantity, saving: 0, discountedDepoTutari: 0, nakit: 0, valor: 0 };
  }
  const isBakiyeTransferi = listing.medicineName === "BAKİYE TRANSFERİ";
  const depoTutari = listing.birimFiyat != null ? listing.birimFiyat * quantity : paid;
  const saving = isBakiyeTransferi ? 0 : Math.max(0, depoTutari - paid);
  const discounted = saving > 0.005;
  const net = paid / quantity;
  const dealSize = listing.totalStock ?? quantity;
  const nakit = discounted && dealSize > quantity ? (dealSize - quantity) * net : 0;
  return {
    paid,
    quantity,
    saving,
    discountedDepoTutari: discounted ? depoTutari : 0,
    nakit,
    valor: nakit * (listing.group.monthlyInterestRate ?? 0),
  };
}

const purchaseSelect = {
  amount: true,
  offer: {
    select: {
      quantity: true,
      listing: {
        select: {
          birimFiyat: true,
          totalStock: true,
          medicineName: true,
          group: { select: { monthlyInterestRate: true } },
        },
      },
    },
  },
} as const;

/** Verilen tarih aralığındaki kazanç özeti (alım anı = cari hesaba işlendiği an). */
export async function getEarnings(
  userId: string,
  groupIds: string[],
  range: { from: Date; to: Date }
): Promise<EarningsSummary> {
  const createdAt = { gte: range.from, lt: range.to };
  const acceptedOnly = { status: "ACCEPTED" as const };

  const [myPurchases, groupPurchases] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { userId, type: "TRADE", amount: { lt: 0 }, createdAt, offer: acceptedOnly },
      select: purchaseSelect,
    }),
    groupIds.length
      ? prisma.ledgerEntry.findMany({
          where: { groupId: { in: groupIds }, type: "TRADE", amount: { lt: 0 }, createdAt, offer: acceptedOnly },
          select: purchaseSelect,
        })
      : Promise.resolve([]),
  ]);

  const summary = emptyEarnings();
  for (const entry of myPurchases) {
    const p = analyzePurchase(entry);
    summary.alimTutari += p.paid;
    summary.alimAdedi += p.quantity;
    summary.alimKazanci += p.saving;
    summary.kazancliAlimDepoTutari += p.discountedDepoTutari;
    summary.stogaBaglanmayanNakit += p.nakit;
    summary.valorKazanci += p.valor;
  }
  for (const entry of groupPurchases) {
    const p = analyzePurchase(entry);
    summary.grupToplamAlim += p.paid;
    summary.grupKazanci += p.saving;
    summary.grupKazancliDepoTutari += p.discountedDepoTutari;
    summary.grupValorKazanci += p.valor;
  }
  return summary;
}
