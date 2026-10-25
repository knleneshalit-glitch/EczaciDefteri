"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, FileSpreadsheet, ChevronLeft, ChevronRight, AlertTriangle, Tag } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import { priceWithoutVat } from "@/lib/pricing";

export type PurchaseRow = {
  offerId: string;
  listingId: string;
  groupId: string;
  groupName: string;
  medicineName: string;
  barkod: string | null;
  expiryDate: Date | null;
  seller: string;
  status: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  depoFiyati: number | null;
  kdvOrani: number;
  createdAt: Date;
  acceptedAt: Date | null;
  priceChanged: boolean;
  shipment: {
    status: string;
    printedAt: Date | null;
    deliveredAt: Date | null;
    courierName: string | null;
    barcodeCount: number;
  } | null;
};

type RowState = "PENDING" | "PREPARING" | "ON_THE_WAY" | "DELIVERED" | "REJECTED" | "CANCELLED";

const STATE_LABEL: Record<RowState, string> = {
  PENDING: "Onay Bekliyor",
  PREPARING: "Kabul Edildi · Hazırlanıyor",
  ON_THE_WAY: "Yolda",
  DELIVERED: "Teslim Alındı",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal Edildi",
};

const STATE_CLASS: Record<RowState, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  PREPARING: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  ON_THE_WAY: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  DELIVERED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400",
  CANCELLED: "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
};

function rowState(r: PurchaseRow): RowState {
  if (r.status === "PENDING") return "PENDING";
  if (r.status === "REJECTED") return "REJECTED";
  if (r.status === "CANCELLED") return "CANCELLED";
  if (r.shipment?.status === "TESLIM_EDILDI") return "DELIVERED";
  if (r.shipment?.status === "TESLIM_ALINDI" || r.shipment?.printedAt) return "ON_THE_WAY";
  return "PREPARING";
}

const TABS: { key: string; label: string; states: RowState[] | null }[] = [
  { key: "tumu", label: "Tümü", states: null },
  { key: "onay", label: "Onay Bekleyen", states: ["PENDING"] },
  { key: "hazirlaniyor", label: "Hazırlanıyor", states: ["PREPARING"] },
  { key: "yolda", label: "Yolda", states: ["ON_THE_WAY"] },
  { key: "teslim", label: "Teslim Alınan", states: ["DELIVERED"] },
  { key: "iptal", label: "Reddedilen / İptal", states: ["REJECTED", "CANCELLED"] },
];

const PAGE_SIZE = 20;
const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("tr-TR") : "—");
const fmtMoney = (n: number | null | undefined) => (n != null ? `${n.toFixed(2)} ₺` : "—");

function saving(r: PurchaseRow) {
  if (r.depoFiyati == null || r.totalPrice == null) return null;
  return Math.max(0, r.depoFiyati * r.quantity - r.totalPrice);
}

export default function PurchasesTable({ rows }: { rows: PurchaseRow[] }) {
  const [tab, setTab] = useState("tumu");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [seller, setSeller] = useState("");
  const [page, setPage] = useState(1);

  const groups = useMemo(() => Array.from(new Set(rows.map((r) => r.groupName))).sort((a, b) => a.localeCompare(b, "tr")), [rows]);
  const sellers = useMemo(() => Array.from(new Set(rows.map((r) => r.seller))).sort((a, b) => a.localeCompare(b, "tr")), [rows]);

  const needle = query.trim().toLocaleLowerCase("tr-TR");
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!group || r.groupName === group) &&
          (!seller || r.seller === seller) &&
          (!needle || r.medicineName.toLocaleLowerCase("tr-TR").includes(needle) || (r.barkod ?? "").includes(needle))
      ),
    [rows, group, seller, needle]
  );
  const counts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((t) => [t.key, t.states ? filtered.filter((r) => t.states!.includes(rowState(r))).length : filtered.length])
      ),
    [filtered]
  );
  const tabDef = TABS.find((t) => t.key === tab) ?? TABS[0];
  const visible = tabDef.states ? filtered.filter((r) => tabDef.states!.includes(rowState(r))) : filtered;

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const accepted = visible.filter((r) => ["PREPARING", "ON_THE_WAY", "DELIVERED"].includes(rowState(r)));
  const totalSpent = accepted.reduce((sum, r) => sum + (r.totalPrice ?? 0), 0);
  const totalSaving = accepted.reduce((sum, r) => sum + (saving(r) ?? 0), 0);

  function exportExcel() {
    downloadCsv(
      `alimlarim-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Ürün", "Barkod", "Grup", "Satıcı", "Miktar", "Birim Fiyat (KDV'li)", "Birim Fiyat (KDV'siz)", "Depo Fiyatı", "Tutar", "Kazanç", "Teklif Tarihi", "Alım Tarihi", "Durum", "Sevkiyatçı", "Karekod"],
      visible.map((r) => [
        r.medicineName,
        r.barkod,
        r.groupName,
        r.seller,
        r.quantity,
        r.unitPrice,
        priceWithoutVat(r.unitPrice, r.kdvOrani),
        r.depoFiyati,
        r.totalPrice,
        saving(r),
        fmtDate(r.createdAt),
        fmtDate(r.acceptedAt),
        STATE_LABEL[rowState(r)],
        r.shipment?.courierName,
        r.shipment?.barcodeCount ?? 0,
      ])
    );
  }

  const selectClass =
    "rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none";

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              setPage(1);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold ${
              tab === t.key ? "bg-emerald-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {t.label}
            <span className={`rounded-full px-1.5 text-[10px] ${tab === t.key ? "bg-white/25" : "bg-slate-100 dark:bg-slate-800"}`}>
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Ürün adı veya barkod ara..."
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <select value={group} onChange={(e) => { setGroup(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">Tüm Gruplar</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select value={seller} onChange={(e) => { setSeller(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">Tüm Satıcı Eczaneler</option>
          {sellers.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <span>
            Alım: <strong className="text-slate-900 dark:text-slate-100">{fmtMoney(totalSpent)}</strong>
          </span>
          <span>
            Kazanç: <strong className="text-emerald-600 dark:text-emerald-400">{fmtMoney(totalSaving)}</strong>
          </span>
          <button
            type="button"
            onClick={exportExcel}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            <FileSpreadsheet className="h-4 w-4" strokeWidth={1.75} />
            Excel
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">Ürün</th>
              <th className="px-3 py-3">Satıcı</th>
              <th className="px-3 py-3 text-right">Miktar</th>
              <th className="px-3 py-3 text-right">Birim Fiyat</th>
              <th className="px-3 py-3 text-right">Tutar / Kazanç</th>
              <th className="px-3 py-3">Tarih</th>
              <th className="px-3 py-3">Durum</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => {
              const state = rowState(r);
              const kazanc = state === "PENDING" || state === "REJECTED" || state === "CANCELLED" ? null : saving(r);
              return (
                <tr key={r.offerId} className="border-b border-slate-200 dark:border-slate-800/60 last:border-0">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{r.medicineName}</p>
                    <p className="text-xs text-slate-500">
                      {r.groupName} · SKT {fmtDate(r.expiryDate)}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">{r.seller}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-200">{r.quantity}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <p className="text-slate-800 dark:text-slate-200">{fmtMoney(r.unitPrice)}</p>
                    <p className="text-xs text-slate-500">KDV&apos;siz {fmtMoney(priceWithoutVat(r.unitPrice, r.kdvOrani))}</p>
                    {r.depoFiyati != null && <p className="text-xs text-slate-400 line-through">{fmtMoney(r.depoFiyati)}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{fmtMoney(r.totalPrice)}</p>
                    {kazanc != null && kazanc > 0 && (
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">+{fmtMoney(kazanc)}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                    <p>Teklif: {fmtDate(r.createdAt)}</p>
                    {r.acceptedAt && <p>Alım: {fmtDate(r.acceptedAt)}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${STATE_CLASS[state]}`}>
                      {STATE_LABEL[state]}
                    </span>
                    {r.priceChanged && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                        Şartlar değişti, onayınız bekleniyor
                      </p>
                    )}
                    {r.shipment?.courierName && state === "ON_THE_WAY" && (
                      <p className="mt-0.5 text-[11px] text-slate-500">Sevkiyatçı: {r.shipment.courierName}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <Link
                      href={`/groups/${r.groupId}/listings/${r.listingId}`}
                      className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Görüntüle
                    </Link>
                    {r.shipment && (
                      <Link
                        href={`/groups/${r.groupId}/listings/${r.listingId}/offers/${r.offerId}/label`}
                        className="ml-2 inline-flex items-center gap-0.5 text-xs text-slate-500 hover:underline"
                      >
                        <Tag className="h-3 w-3" strokeWidth={1.75} />
                        Fiş
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                  Bu filtreyle eşleşen alım yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-500">
          <span>
            Toplam {visible.length} kayıttan {visible.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} -{" "}
            {Math.min(currentPage * PAGE_SIZE, visible.length)} arası
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Önceki sayfa"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <span>
              Sayfa {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              aria-label="Sonraki sayfa"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
