export type TierInput = {
  minQuantity: number;
  bonusQuantity: number;
  discountPercent: number;
  discountAmount: number;
};

export function netUnitPrice(birimFiyat: number, tier: TierInput | null) {
  if (!tier) return birimFiyat;
  const afterPercent = birimFiyat - (birimFiyat * tier.discountPercent) / 100;
  const afterAmount = afterPercent - tier.discountAmount;
  return Math.max(0, afterAmount);
}

export function matchTier<T extends TierInput>(tiers: T[], quantity: number): T | null {
  const eligible = tiers.filter((t) => quantity >= t.minQuantity);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, t) => (t.minQuantity > best.minQuantity ? t : best));
}
