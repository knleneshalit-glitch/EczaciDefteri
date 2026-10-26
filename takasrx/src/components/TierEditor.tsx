"use client";

import { useState } from "react";
import { Plus, Trash2, Layers } from "lucide-react";
import { tierUnitPrice, priceWithoutVat, type TierTerms } from "@/lib/pricing";

type Row = { alimMiktari: string; mfMiktari: string; iskontoYuzde: string; iskontoTL: string };

const MAX_TIERS = 6;

function toRow(t: TierTerms): Row {
  return {
    alimMiktari: String(t.alimMiktari),
    mfMiktari: String(t.mfMiktari),
    iskontoYuzde: t.iskontoYuzde ? String(t.iskontoYuzde) : "",
    iskontoTL: t.iskontoTL ? String(t.iskontoTL) : "",
  };
}

function toTerms(r: Row): TierTerms | null {
  const alim = Number(r.alimMiktari);
  if (!Number.isFinite(alim) || alim <= 0) return null;
  return {
    alimMiktari: Math.round(alim),
    mfMiktari: Math.max(0, Math.round(Number(r.mfMiktari) || 0)),
    iskontoYuzde: Number(r.iskontoYuzde) || null,
    iskontoTL: Number(r.iskontoTL) || null,
  };
}

/**
 * Depo özel şartı ilanları için kademeli depo şartları (ör. 50+10, 100+30).
 * Satırları "tiers" adlı gizli alana JSON olarak yazar.
 */
export default function TierEditor({
  birimFiyat,
  kdvOrani,
  initial = [],
  name = "tiers",
}: {
  birimFiyat: number;
  kdvOrani: number;
  initial?: TierTerms[];
  name?: string;
}) {
  const [rows, setRows] = useState<Row[]>(initial.map(toRow));
  const terms = rows.map(toTerms);
  const valid = terms.filter((t): t is TierTerms => t != null);

  function update(i: number, key: keyof Row, value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none";

  return (
    <div className="mt-4 rounded-lg border border-violet-500/30 bg-violet-500/5 p-4">
      <input type="hidden" name={name} value={JSON.stringify(valid)} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400" strokeWidth={1.75} />
          Kademeli Depo Şartları (opsiyonel)
        </p>
        <button
          type="button"
          disabled={rows.length >= MAX_TIERS}
          onClick={() => setRows((prev) => [...prev, { alimMiktari: "", mfMiktari: "", iskontoYuzde: "", iskontoTL: "" }])}
          className="flex items-center gap-1 rounded-md border border-violet-500/40 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-400 hover:bg-violet-500/10 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Kademe Ekle
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Depo, toplu alımda daha iyi şart veriyorsa her kademeyi girin (ör. 50 adet alana 10 MF,
        100 adet alana 30 MF). Grubun toplam talebi hangi kademeye ulaşırsa ilan sayfasında
        gösterilir; ürünü stoğa dönüştürürken ulaşılan şartı seçersiniz.
      </p>
      {rows.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-1 pr-2">Alım Miktarı</th>
                <th className="pb-1 pr-2">MF</th>
                <th className="pb-1 pr-2">İskonto %</th>
                <th className="pb-1 pr-2">İskonto ₺ (toplam)</th>
                <th className="pb-1 pr-2">Net (KDV&apos;li / KDV&apos;siz)</th>
                <th className="pb-1" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const t = terms[i];
                const net = t ? tierUnitPrice(birimFiyat || null, t) : null;
                return (
                  <tr key={i}>
                    <td className="py-1 pr-2">
                      <input type="number" min={1} value={r.alimMiktari} onChange={(e) => update(i, "alimMiktari", e.target.value)} className={inputClass} placeholder="50" />
                    </td>
                    <td className="py-1 pr-2">
                      <input type="number" min={0} value={r.mfMiktari} onChange={(e) => update(i, "mfMiktari", e.target.value)} className={inputClass} placeholder="10" />
                    </td>
                    <td className="py-1 pr-2">
                      <input type="number" min={0} max={100} step="0.01" value={r.iskontoYuzde} onChange={(e) => update(i, "iskontoYuzde", e.target.value)} className={inputClass} />
                    </td>
                    <td className="py-1 pr-2">
                      <input type="number" min={0} step="0.01" value={r.iskontoTL} onChange={(e) => update(i, "iskontoTL", e.target.value)} className={inputClass} />
                    </td>
                    <td className="py-1 pr-2 whitespace-nowrap font-medium text-emerald-700 dark:text-emerald-400">
                      {net != null && birimFiyat > 0
                        ? `${net.toFixed(2)} ₺ / ${priceWithoutVat(net, kdvOrani)!.toFixed(2)} ₺`
                        : "—"}
                    </td>
                    <td className="py-1 text-right">
                      <button
                        type="button"
                        aria-label="Kademeyi sil"
                        onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                        className="rounded p-1 text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
