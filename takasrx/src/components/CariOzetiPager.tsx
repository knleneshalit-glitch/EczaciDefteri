"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight, User, Users } from "lucide-react";

function CariRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "positive" | "negative" | "neutral";
}) {
  const valueColor =
    highlight === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : highlight === "negative"
        ? "text-red-600 dark:text-red-400"
        : "text-slate-900 dark:text-slate-100";
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-4 py-3 ${
        highlight ? "bg-slate-100 dark:bg-slate-800/60" : ""
      }`}
    >
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      <span className={`text-base font-bold ${valueColor}`}>{value}</span>
    </div>
  );
}

type CariData = {
  bakiye: number;
  grupYuku: number;
  toplamCari: number;
  toplamAlim: number;
  toplamSatis: number;
};

function CariPage({ data }: { data: CariData }) {
  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2">
      <CariRow
        label="Bakiye"
        value={`${data.bakiye.toFixed(2)} ₺`}
        highlight={data.bakiye >= 0 ? "positive" : "negative"}
      />
      <CariRow
        label="Grup Yükü"
        value={`${data.grupYuku.toFixed(2)} ₺`}
        highlight={data.grupYuku >= 0 ? "positive" : "negative"}
      />
      <CariRow label="Toplam" value={`${data.toplamCari.toFixed(2)} ₺`} highlight="neutral" />
      <CariRow label="Toplam Alım" value={`${data.toplamAlim.toFixed(2)} ₺`} />
      <CariRow label="Toplam Satış" value={`${data.toplamSatis.toFixed(2)} ₺`} />
    </div>
  );
}

export default function CariOzetiPager({
  personal,
  group,
}: {
  personal: CariData;
  group: CariData;
}) {
  const [page, setPage] = useState(0);
  const pages: { label: string; Icon: LucideIcon; data: CariData }[] = [
    { label: "Eczaneye Özel", Icon: User, data: personal },
    { label: "Tüm Grup", Icon: Users, data: group },
  ];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          {(() => {
            const Icon = pages[page].Icon;
            return <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />;
          })()}
          {pages[page].label}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => (p - 1 + pages.length) % pages.length)}
            className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Önceki"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
          {pages.map((p, i) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setPage(i)}
              className={`h-1.5 w-1.5 rounded-full ${i === page ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`}
              aria-label={p.label}
            />
          ))}
          <button
            type="button"
            onClick={() => setPage((p) => (p + 1) % pages.length)}
            className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Sonraki"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
      <CariPage data={pages[page].data} />
    </div>
  );
}
