import { foldTr } from "@/lib/search";

/** Excel'den kopyalanan (sekme) ya da CSV (; veya ,) metni satır/hücrelere ayırır. */
export function parseDelimited(text: string): string[][] {
  const clean = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const firstLine = clean.split("\n").find((l) => l.trim()) ?? "";
  const delimiter = firstLine.includes("\t")
    ? "\t"
    : (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === "") {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

/** "1.234,56", "98,9", "98.9", "120 ₺" gibi değerleri sayıya çevirir. */
export function parseTrNumber(value: string | undefined): number | null {
  if (value == null) return null;
  let s = value.replace(/[₺\s]/g, "").replace(/tl$/i, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * SKT değerini "YYYY-AA-GG" biçimine çevirir. GG.AA.YYYY, GG/AA/YYYY,
 * YYYY-AA-GG ve sadece ay/yıl (AA.YYYY → ayın son günü) kabul edilir.
 */
export function parseTrDate(value: string | undefined): string | null {
  if (!value) return null;
  const s = value.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return toIso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (m) return toIso(normalizeYear(+m[3]), +m[2], +m[1]);
  m = s.match(/^(\d{1,2})[./-](\d{4})$/);
  if (m) {
    const year = +m[2];
    const month = +m[1];
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return toIso(year, month, lastDay);
  }
  return null;
}

function normalizeYear(y: number) {
  return y < 100 ? 2000 + y : y;
}

function toIso(y: number, m: number, d: number) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export const IMPORT_COLUMNS = [
  { key: "medicineName", label: "İlaç Adı", aliases: ["ilacadi", "urunadi", "ilac", "urun", "ad"] },
  { key: "barkod", label: "Barkod", aliases: ["barkod", "barcode"] },
  { key: "birimFiyat", label: "Depo Fiyatı", aliases: ["depofiyati", "depocufiyati", "birimfiyat", "fiyat"] },
  { key: "totalStock", label: "Toplam Stok", aliases: ["toplamstok", "stok", "adet", "miktar"] },
  { key: "dealBonusQuantity", label: "MF", aliases: ["mf", "malfazlasi"] },
  { key: "expiryDate", label: "SKT", aliases: ["skt", "miad", "sonkullanmatarihi"] },
  { key: "kdvOrani", label: "KDV", aliases: ["kdv", "kdvorani"] },
  { key: "description", label: "Açıklama", aliases: ["aciklama", "not"] },
  { key: "minAlim", label: "Min Alım", aliases: ["minalim", "minimumalim"] },
  { key: "maxAlim", label: "Maks Alım", aliases: ["maksalim", "maxalim", "maksimumalim"] },
  { key: "alimKatlari", label: "Alım Katları", aliases: ["alimkatlari", "katlar"] },
] as const;

export type ImportColumnKey = (typeof IMPORT_COLUMNS)[number]["key"];

/** Başlık satırındaki hücreleri sütun anahtarlarına eşler. */
export function mapHeaders(header: string[]): (ImportColumnKey | null)[] {
  return header.map((h) => {
    const norm = foldTr(h)
      .replace(/ş/g, "s")
      .replace(/ç/g, "c")
      .replace(/ğ/g, "g")
      .replace(/ö/g, "o")
      .replace(/ü/g, "u")
      .replace(/[^a-z]/g, "");
    const col = IMPORT_COLUMNS.find((c) => (c.aliases as readonly string[]).includes(norm));
    return col ? col.key : null;
  });
}
