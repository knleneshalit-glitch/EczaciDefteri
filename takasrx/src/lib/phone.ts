/**
 * Telefon numarasını doğrular: boşsa null, geçersizse "invalid" döner.
 * Kullanıcının yazdığı biçim (boşluklar vb.) korunur.
 */
export function normalizePhone(raw: string): string | null | "invalid" {
  const value = raw.trim().replace(/\s+/g, " ");
  if (!value) return null;
  if (!/^[+\d\s()-]+$/.test(value)) return "invalid";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return "invalid";
  return value;
}

/** tel: bağlantısı için sadece rakam ve + işaretini bırakır. */
export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
