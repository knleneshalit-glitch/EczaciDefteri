/** Türkiye saati (UTC+3, yaz saati uygulaması yok). */
const TR_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Verilen anın Türkiye saatine göre gün başlangıcı (00:00). */
export function istanbulDayStart(d: Date = new Date()) {
  const local = new Date(d.getTime() + TR_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - TR_OFFSET_MS);
}

/** Türkiye saatine göre "YYYY-AA-GG" gün anahtarı. */
export function istanbulDateKey(d: Date) {
  return new Date(d.getTime() + TR_OFFSET_MS).toISOString().slice(0, 10);
}

/** "YYYY-AA-GG" anahtarının Türkiye saatine göre gün başlangıcı. */
export function istanbulDayStartFromKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - TR_OFFSET_MS);
}

export function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * DAY_MS);
}

export function formatTr(d: Date | null | undefined, withTime = false) {
  if (!d) return "—";
  return d.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    dateStyle: "short",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  });
}
