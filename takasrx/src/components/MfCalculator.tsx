"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import { bonusForTargetPrice } from "@/lib/pricing";

/** Hedef net fiyattan mal fazlası adedini hesaplayıp forma uygular. */
export default function MfCalculator({
  birimFiyat,
  totalStock,
  onApply,
  disabled = false,
}: {
  birimFiyat: number;
  totalStock: number;
  onApply: (bonus: number) => void;
  disabled?: boolean;
}) {
  const [target, setTarget] = useState("");
  const targetNet = Number(target) || 0;
  const bonus = bonusForTargetPrice(birimFiyat, totalStock, targetNet);
  const ready = !disabled && birimFiyat > 0 && totalStock > 0 && targetNet > 0 && targetNet < birimFiyat;

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-dashed border-slate-300 dark:border-slate-700 p-3">
      <div>
        <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          <Calculator className="h-3.5 w-3.5" strokeWidth={1.75} />
          Net Fiyattan MF Hesapla
        </label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={target}
          disabled={disabled}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Hedef net fiyat (₺)"
          className="w-44 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
        />
      </div>
      <button
        type="button"
        disabled={!ready}
        onClick={() => onApply(bonus)}
        className="rounded-md border border-emerald-500/50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40"
      >
        {ready ? `MF = ${bonus} olarak uygula` : "MF Hesapla"}
      </button>
      <p className="w-full text-[11px] text-slate-500">
        Depo fiyatı ve toplam stok girildikten sonra ulaşmak istediğiniz net fiyatı yazın; sistem
        gereken mal fazlası adedini hesaplar.
      </p>
    </div>
  );
}
