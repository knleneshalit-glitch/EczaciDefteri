/**
 * Türkçe aramada büyük/küçük harf ve I/İ/ı/i farkını ortadan kaldırır:
 * "AUGMENTIN", "Augmentin" ve "augmentin" aynı sonuca ulaşır.
 */
export function foldTr(value: string) {
  return value.toLocaleLowerCase("tr-TR").replace(/ı/g, "i");
}
