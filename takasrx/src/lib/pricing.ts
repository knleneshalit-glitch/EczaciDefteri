/**
 * İlan sahibi depodan toplu alım yaparken mal fazlası kazanır
 * (ör. 1000 adet parayla al, 500 adet mal fazlası kazan, elde 1500 adet olur).
 * Ayrıca depo/firma bazen faturaya yansımayan ekstra bir nakit indirim de
 * yapabilir (ör. toplam 100.000 TL tutan alımda elden 1000 TL indirim).
 * Bu fonksiyon, mal fazlası ve ekstra indirimin toplam maliyeti düşürdüğü
 * gerçek (efektif) birim fiyatı hesaplar; grup üyeleri ilandan bu fiyat
 * üzerinden alım yapar.
 */
export function effectiveUnitPrice(listing: {
  birimFiyat: number | null;
  totalStock: number | null;
  dealBonusQuantity: number | null;
  ekstraIndirim?: number | null;
}): number | null {
  const { birimFiyat, totalStock, dealBonusQuantity, ekstraIndirim } = listing;
  if (birimFiyat == null) return null;
  if (!totalStock || totalStock <= 0) return birimFiyat;

  const bonus =
    dealBonusQuantity != null && dealBonusQuantity > 0 && dealBonusQuantity < totalStock
      ? dealBonusQuantity
      : 0;
  const paidQuantity = totalStock - bonus;
  let totalCost = birimFiyat * paidQuantity;

  if (ekstraIndirim && ekstraIndirim > 0) {
    totalCost = Math.max(0, totalCost - ekstraIndirim);
  }

  return totalCost / totalStock;
}
