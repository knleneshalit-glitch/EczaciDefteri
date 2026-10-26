"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Upload, Download, CheckCircle2, AlertTriangle, ClipboardPaste } from "lucide-react";
import { importListingsAction, type ImportRow } from "@/app/actions/listings";
import { downloadCsv } from "@/lib/csv";
import { IMPORT_COLUMNS, mapHeaders, parseDelimited, parseTrDate, parseTrNumber } from "@/lib/tabular-import";

type ParsedRow = { row: ImportRow; error: string | null };

function toRows(text: string): { rows: ParsedRow[]; headerError: string | null } {
  const table = parseDelimited(text);
  if (table.length < 2) return { rows: [], headerError: table.length === 1 ? "Başlık satırının altında veri yok." : null };
  const keys = mapHeaders(table[0]);
  if (!keys.includes("medicineName") || !keys.includes("birimFiyat") || !keys.includes("totalStock")) {
    return {
      rows: [],
      headerError: "Başlık satırında en az \"İlaç Adı\", \"Depo Fiyatı\" ve \"Toplam Stok\" sütunları olmalı. Şablonu indirip kullanabilirsiniz.",
    };
  }
  const rows = table.slice(1).map((cells) => {
    const get = (key: string) => {
      const idx = keys.indexOf(key as never);
      return idx >= 0 ? cells[idx] : undefined;
    };
    const medicineName = (get("medicineName") ?? "").trim();
    const isBakiye = medicineName.toLocaleUpperCase("tr-TR") === "BAKİYE TRANSFERİ";
    const row: ImportRow = {
      medicineName,
      barkod: get("barkod") || null,
      birimFiyat: parseTrNumber(get("birimFiyat")),
      totalStock: parseTrNumber(get("totalStock")),
      dealBonusQuantity: parseTrNumber(get("dealBonusQuantity")),
      expiryDate: parseTrDate(get("expiryDate")),
      kdvOrani: parseTrNumber(get("kdvOrani")),
      description: get("description") || null,
      minAlim: parseTrNumber(get("minAlim")),
      maxAlim: parseTrNumber(get("maxAlim")),
      alimKatlari: parseTrNumber(get("alimKatlari")),
    };
    let error: string | null = null;
    if (!medicineName) error = "İlaç adı boş";
    else if (!row.birimFiyat || row.birimFiyat <= 0) error = "Depo fiyatı okunamadı";
    else if (!row.totalStock || row.totalStock <= 0) error = "Toplam stok okunamadı";
    else if (row.dealBonusQuantity != null && row.dealBonusQuantity >= row.totalStock) error = "MF stoktan büyük";
    else if (!isBakiye && !row.expiryDate) error = "SKT okunamadı (GG.AA.YYYY)";
    return { row, error };
  });
  return { rows, headerError: null };
}

export default function ImportForm({ groups }: { groups: { id: string; name: string }[] }) {
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null);

  const parsed = useMemo(() => (text.trim() ? toRows(text) : { rows: [], headerError: null }), [text]);
  const validRows = parsed.rows.filter((r) => !r.error);

  function downloadTemplate() {
    downloadCsv(
      "takasrx-teklif-sablonu",
      IMPORT_COLUMNS.map((c) => c.label),
      [["PAROL 500 MG 20 TABLET", "8699514010019", "45,90", "100", "20", "31.12.2027", "10", "Hızlı teslim", "", "", ""]]
    );
  }

  async function onFile(file: File | null) {
    if (!file) return;
    setResult(null);
    setText(await file.text());
  }

  function submit() {
    setResult(null);
    startTransition(async () => {
      const res = await importListingsAction(
        groupId,
        validRows.map((r) => r.row)
      );
      setResult(res);
      if (res.created > 0) setText("");
    });
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Grup</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">CSV Dosyası</label>
            <input
              type="file"
              accept=".csv,.txt,text/csv"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              className="text-xs text-slate-600 dark:text-slate-400 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs"
            />
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 rounded-md border border-emerald-500/50 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
          >
            <Download className="h-4 w-4" strokeWidth={1.75} />
            Şablonu İndir
          </button>
        </div>
        <label className="mt-4 mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          <ClipboardPaste className="h-4 w-4" strokeWidth={1.75} />
          ya da Excel&apos;den kopyalayıp yapıştırın (başlık satırı dahil)
        </label>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
          rows={6}
          placeholder={IMPORT_COLUMNS.map((c) => c.label).join("\t")}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-500">
          Sütunlar: {IMPORT_COLUMNS.map((c) => c.label).join(", ")}. Zorunlu: İlaç Adı, Depo Fiyatı (KDV dahil),
          Toplam Stok ve SKT (GG.AA.YYYY ya da AA.YYYY). Ondalıklar virgülle yazılabilir.
        </p>
      </section>

      {parsed.headerError && (
        <p className="flex items-center gap-1.5 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
          {parsed.headerError}
        </p>
      )}

      {parsed.rows.length > 0 && (
        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Önizleme: {parsed.rows.length} satır · <span className="text-emerald-600 dark:text-emerald-400">{validRows.length} geçerli</span>
              {parsed.rows.length - validRows.length > 0 && (
                <span className="text-red-600 dark:text-red-400"> · {parsed.rows.length - validRows.length} hatalı</span>
              )}
            </p>
            <button
              type="button"
              disabled={isPending || validRows.length === 0 || !groupId}
              onClick={submit}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" strokeWidth={1.75} />
              {isPending ? "Aktarılıyor..." : `${validRows.length} İlanı Yayınla`}
            </button>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">İlaç Adı</th>
                  <th className="px-3 py-2">Barkod</th>
                  <th className="px-3 py-2 text-right">Depo Fiyatı</th>
                  <th className="px-3 py-2 text-right">Stok / MF</th>
                  <th className="px-3 py-2">SKT</th>
                  <th className="px-3 py-2">KDV</th>
                  <th className="px-3 py-2">Durum</th>
                </tr>
              </thead>
              <tbody>
                {parsed.rows.map(({ row, error }, i) => (
                  <tr key={i} className={`border-t border-slate-200 dark:border-slate-800/60 ${error ? "bg-red-500/5" : ""}`}>
                    <td className="px-3 py-1.5 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-1.5 font-medium text-slate-900 dark:text-slate-100">{row.medicineName || "—"}</td>
                    <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400">{row.barkod ?? "—"}</td>
                    <td className="px-3 py-1.5 text-right text-slate-700 dark:text-slate-300">
                      {row.birimFiyat != null ? `${row.birimFiyat.toFixed(2)} ₺` : "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-700 dark:text-slate-300">
                      {row.totalStock ?? "—"}
                      {row.dealBonusQuantity ? ` (${row.dealBonusQuantity} MF)` : ""}
                    </td>
                    <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400">
                      {row.expiryDate ? row.expiryDate.split("-").reverse().join(".") : "—"}
                    </td>
                    <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400">%{row.kdvOrani ?? 10}</td>
                    <td className="px-3 py-1.5">
                      {error ? (
                        <span className="text-red-600 dark:text-red-400">{error}</span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                          Hazır
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {result && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            result.created > 0 ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300" : "bg-red-500/10 text-red-700 dark:text-red-400"
          }`}
        >
          <p className="font-semibold">{result.created} ilan yayınlandı.</p>
          {result.errors.map((e) => (
            <p key={`${e.row}-${e.message}`} className="text-xs">
              Satır {e.row}: {e.message}
            </p>
          ))}
          {result.created > 0 && (
            <Link href="/listings" className="mt-1 inline-block text-xs font-semibold underline">
              İlanlarıma git →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
