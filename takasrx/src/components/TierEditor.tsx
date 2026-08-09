"use client";

import { useState } from "react";

type Tier = {
  minQuantity: string;
  bonusQuantity: string;
  discountPercent: string;
  discountAmount: string;
};

const EMPTY_TIER: Tier = {
  minQuantity: "",
  bonusQuantity: "0",
  discountPercent: "0",
  discountAmount: "0",
};

function netPrice(birimFiyat: number, tier: Tier) {
  const percent = Number(tier.discountPercent) || 0;
  const amount = Number(tier.discountAmount) || 0;
  const afterPercent = birimFiyat - (birimFiyat * percent) / 100;
  return Math.max(0, afterPercent - amount);
}

export default function TierEditor({ birimFiyat }: { birimFiyat: number }) {
  const [tiers, setTiers] = useState<Tier[]>([{ ...EMPTY_TIER }]);

  function updateTier(index: number, patch: Partial<Tier>) {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function addTier() {
    setTiers((prev) => [...prev, { ...EMPTY_TIER }]);
  }

  function removeTier(index: number) {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      <input
        type="hidden"
        name="tiers"
        value={JSON.stringify(
          tiers
            .filter((t) => Number(t.minQuantity) > 0)
            .map((t) => ({
              minQuantity: Number(t.minQuantity) || 0,
              bonusQuantity: Number(t.bonusQuantity) || 0,
              discountPercent: Number(t.discountPercent) || 0,
              discountAmount: Number(t.discountAmount) || 0,
            }))
        )}
      />

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-800/40 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Alım Miktarı</th>
              <th className="px-3 py-2">Mal Fazlası</th>
              <th className="px-3 py-2">İskonto (%)</th>
              <th className="px-3 py-2">İskonto (TL)</th>
              <th className="px-3 py-2">Net Fiyat</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {tiers.map((t, i) => (
              <tr key={i} className="border-b border-slate-800/60 last:border-0">
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={1}
                    value={t.minQuantity}
                    onChange={(e) => updateTier(i, { minQuantity: e.target.value })}
                    className="w-24 rounded border border-slate-700 px-2 py-1 text-sm"
                    placeholder="ör. 100"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={0}
                    value={t.bonusQuantity}
                    onChange={(e) => updateTier(i, { bonusQuantity: e.target.value })}
                    className="w-20 rounded border border-slate-700 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={t.discountPercent}
                    onChange={(e) => updateTier(i, { discountPercent: e.target.value })}
                    className="w-20 rounded border border-slate-700 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={t.discountAmount}
                    onChange={(e) => updateTier(i, { discountAmount: e.target.value })}
                    className="w-20 rounded border border-slate-700 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-3 py-1.5 font-medium text-slate-300">
                  {birimFiyat > 0 ? netPrice(birimFiyat, t).toFixed(2) : "0.00"} ₺
                </td>
                <td className="px-2 py-1.5">
                  {tiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTier(i)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Sil
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addTier}
        className="mt-2 rounded-md border border-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10"
      >
        + Yeni Şart
      </button>
      <p className="mt-1 text-xs text-slate-400">
        Alım miktarı boş bırakılan satırlar dikkate alınmaz. Birden fazla eşik girerseniz, alıcının miktarına en yakın (en yüksek) eşik uygulanır.
      </p>
    </div>
  );
}
