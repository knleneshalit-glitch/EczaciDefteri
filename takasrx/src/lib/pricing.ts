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
