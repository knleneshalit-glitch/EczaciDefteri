/**
 * İlan sahibi depodan toplu alım yaparken mal fazlası kazanır
 * (ör. 1000 adet parayla al, 500 adet mal fazlası kazan, elde 1500 adet olur).
 * Bu fonksiyon, o mal fazlasının maliyeti düşürdüğü gerçek (efektif) birim
 * fiyatı hesaplar; grup üyeleri ilandan bu fiyat üzerinden alım yapar.
 */
export function effectiveUnitPrice(listing: {
  birimFiyat: number | null;
  totalStock: number | null;
  dealBonusQuantity: number | null;
}): number | null {
  const { birimFiyat, totalStock, dealBonusQuantity } = listing;
  if (birimFiyat == null) return null;
  if (!totalStock || !dealBonusQuantity || dealBonusQuantity <= 0 || dealBonusQuantity >= totalStock) {
    return birimFiyat;
  }
  const paidQuantity = totalStock - dealBonusQuantity;
  return (birimFiyat * paidQuantity) / totalStock;
}
