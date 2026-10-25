/**
 * İlan sahibi depodan toplu alım yaparken mal fazlası kazanır
 * (ör. 1000 adet parayla al, 500 adet mal fazlası kazan, elde 1500 adet olur).
 * Ayrıca depo/firma bazen faturaya yansımayan ekstra bir nakit indirim
 * (ör. toplam 100.000 TL tutan alımda elden 1000 TL indirim) ya da bir
 * kampanya yüzdesi (ör. %3 ekstra iskonto) de uygulayabilir. Bu fonksiyon,
 * mal fazlası, yüzde iskontosu ve nakit indirimin toplam maliyeti düşürdüğü
 * gerçek (efektif) birim fiyatı hesaplar; grup üyeleri ilandan bu fiyat
 * üzerinden alım yapar.
 */
export function effectiveUnitPrice(listing: {
  birimFiyat: number | null;
  totalStock: number | null;
  dealBonusQuantity: number | null;
  ekstraIndirim?: number | null;
  ekstraIskontoYuzde?: number | null;
}): number | null {
  const { birimFiyat, totalStock, dealBonusQuantity, ekstraIndirim, ekstraIskontoYuzde } = listing;
  if (birimFiyat == null) return null;
  if (!totalStock || totalStock <= 0) return birimFiyat;

  const bonus =
    dealBonusQuantity != null && dealBonusQuantity > 0 && dealBonusQuantity < totalStock
      ? dealBonusQuantity
      : 0;
  const paidQuantity = totalStock - bonus;
  let totalCost = birimFiyat * paidQuantity;

  if (ekstraIskontoYuzde && ekstraIskontoYuzde > 0) {
    totalCost = totalCost * (1 - Math.min(ekstraIskontoYuzde, 100) / 100);
  }

  if (ekstraIndirim && ekstraIndirim > 0) {
    totalCost = Math.max(0, totalCost - ekstraIndirim);
  }

  return totalCost / totalStock;
}

export const KDV_ORANLARI = [0, 1, 10, 20] as const;

/** Depo fiyatı KDV dahil girildiği için net fiyattan KDV'yi ayırır. */
export function priceWithoutVat(price: number | null, kdvOrani: number | null | undefined) {
  if (price == null) return null;
  return price / (1 + (kdvOrani ?? 10) / 100);
}

export type TierTerms = {
  alimMiktari: number;
  mfMiktari: number;
  iskontoYuzde?: number | null;
  iskontoTL?: number | null;
};

/** Bir depo kademesinin (ör. 50+10, %2 iskonto) efektif birim fiyatı. */
export function tierUnitPrice(birimFiyat: number | null, tier: TierTerms) {
  return effectiveUnitPrice({
    birimFiyat,
    totalStock: tier.alimMiktari + tier.mfMiktari,
    dealBonusQuantity: tier.mfMiktari,
    ekstraIskontoYuzde: tier.iskontoYuzde ?? null,
    ekstraIndirim: tier.iskontoTL ?? null,
  });
}

/** Grubun toplam talebiyle ulaşılan en yüksek kademeyi bulur. */
export function reachedTier<T extends TierTerms>(tiers: T[], demandQty: number): T | null {
  let best: T | null = null;
  for (const t of tiers) {
    if (t.alimMiktari + t.mfMiktari <= demandQty && (!best || t.alimMiktari + t.mfMiktari > best.alimMiktari + best.mfMiktari)) {
      best = t;
    }
  }
  return best;
}

/**
 * Hedef net fiyata inmek için toplam stoğun kaçının mal fazlası olması
 * gerektiğini hesaplar ("Net Fiyattan MF Hesapla").
 */
export function bonusForTargetPrice(birimFiyat: number, totalStock: number, targetNet: number) {
  if (birimFiyat <= 0 || totalStock <= 0 || targetNet <= 0 || targetNet >= birimFiyat) return 0;
  return Math.min(totalStock - 1, Math.round(totalStock * (1 - targetNet / birimFiyat)));
}
