"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  Building2,
  Search,
  Check,
  X,
  Send,
  Tag,
  Undo2,
  Ban,
  FileSpreadsheet,
  Info,
  QrCode,
  ExternalLink,
  Boxes,
} from "lucide-react";
import {
  bulkRespondOffersAction,
  bulkSendShipmentsAction,
  bulkRemoveFromShipmentAction,
  bulkCancelOffersAction,
  ensureShipmentsAction,
  bulkPackShipmentsAction,
  type BulkResult,
} from "@/app/actions/shipments";
import { downloadCsv } from "@/lib/csv";
import { priceWithoutVat } from "@/lib/pricing";
import { foldTr } from "@/lib/search";

export type BoardProduct = {
  listingId: string;
  groupId: string;
  groupName: string;
  medicineName: string;
  barkod: string | null;
  createdAt: Date;
  expiryDate: Date | null;
  birimFiyat: number | null;
  netFiyat: number | null;
  kdvOrani: number;
  terms: string;
  extra: string;
  totalStock: number | null;
};

export type BoardLine = {
  offerId: string;
  listingId: string;
  groupId: string;
  status: "PENDING" | "ACCEPTED";
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  message: string | null;
  createdAt: Date;
  acceptedAt: Date | null;
  buyer: {
    id: string;
    name: string;
    gln: string | null;
    contactName: string;
    email: string;
    region: string;
    district: string | null;
    address: string | null;
  };
  shipment: {
    id: string;
    code: string;
    status: string;
    printedAt: Date | null;
    courierName: string | null;
    packageCode: string | null;
    barcodeCount: number;
  } | null;
};

type LineState = "PENDING" | "UNSENT" | "PREPARING" | "READY" | "PICKED" | "DELIVERED";

const STATE_LABEL: Record<LineState, string> = {
  PENDING: "Onay Bekliyor",
  UNSENT: "Gönderilmedi",
  PREPARING: "Hazırlanıyor",
  READY: "Sevkiyatçı Bekleniyor",
  PICKED: "Sevkiyatçı Teslim Aldı",
  DELIVERED: "Teslim Edildi",
};

const STATE_CLASS: Record<LineState, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  UNSENT: "bg-red-500/10 text-red-700 dark:text-red-400",
  PREPARING: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  READY: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  PICKED: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  DELIVERED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

function lineState(l: BoardLine): LineState {
  if (l.status === "PENDING") return "PENDING";
  if (!l.shipment) return "UNSENT";
  if (l.shipment.status === "TESLIM_EDILDI") return "DELIVERED";
  if (l.shipment.status === "TESLIM_ALINDI") return "PICKED";
  if (!l.shipment.printedAt) return "PREPARING";
  return "READY";
}

const TABS: { key: string; label: string; match: (s: LineState, l: BoardLine) => boolean }[] = [
  { key: "tumu", label: "Tümü", match: () => true },
  { key: "onay", label: "Onay Bekleyenler", match: (s) => s === "PENDING" },
  { key: "gonderilmeyen", label: "Gönderilmeyenler", match: (s) => s === "UNSENT" || s === "PREPARING" },
  { key: "teslimAlinmayan", label: "Teslim Alınmayanlar", match: (s) => s === "READY" || s === "PICKED" },
  { key: "teslimAlinan", label: "Teslim Alınanlar", match: (s) => s === "DELIVERED" },
  {
    key: "karekod",
    label: "Karekod Eksikler",
    match: (_s, l) => l.status === "ACCEPTED" && !l.shipment?.barcodeCount,
  },
];

const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("tr-TR") : "—");
const fmtMoney = (n: number | null) => (n != null ? `${n.toFixed(2)} ₺` : "—");

export default function ShipmentsBoard({ products, lines }: { products: BoardProduct[]; lines: BoardLine[] }) {
  const router = useRouter();
  const [view, setView] = useState<"urun" | "eczane">("urun");
  const [tab, setTab] = useState("tumu");
  const [query, setQuery] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLElement>(null);
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const tabDef = TABS.find((t) => t.key === tab) ?? TABS[0];
  const tabLines = useMemo(() => lines.filter((l) => tabDef.match(lineState(l), l)), [lines, tabDef]);
  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.key, lines.filter((l) => t.match(lineState(l), l)).length])),
    [lines]
  );

  const needle = foldTr(query.trim());

  const productRows = useMemo(
    () =>
      products
        .filter((p) => tabLines.some((l) => l.listingId === p.listingId))
        .filter((p) => !needle || foldTr(p.medicineName).includes(needle) || (p.barkod ?? "").includes(needle))
        .map((p) => {
          const own = lines.filter((l) => l.listingId === p.listingId);
          const accepted = own.filter((l) => l.status === "ACCEPTED");
          return {
            product: p,
            distributed: accepted.reduce((sum, l) => sum + l.quantity, 0),
            total: accepted.reduce((sum, l) => sum + (l.totalPrice ?? 0), 0),
            open: own.some((l) => ["PENDING", "UNSENT", "PREPARING"].includes(lineState(l))),
          };
        }),
    [products, tabLines, lines, needle]
  );

  const pharmacyRows = useMemo(() => {
    const byBuyer = new Map<string, { buyer: BoardLine["buyer"]; lineCount: number; openCount: number }>();
    for (const l of tabLines) {
      const row = byBuyer.get(l.buyer.id) ?? { buyer: l.buyer, lineCount: 0, openCount: 0 };
      row.lineCount++;
      if (["PENDING", "UNSENT", "PREPARING"].includes(lineState(l))) row.openCount++;
      byBuyer.set(l.buyer.id, row);
    }
    return Array.from(byBuyer.values())
      .filter((r) => !needle || foldTr(r.buyer.name).includes(needle) || (r.buyer.gln ?? "").includes(needle))
      .sort((a, b) => a.buyer.name.localeCompare(b.buyer.name, "tr"));
  }, [tabLines, needle]);

  const productById = useMemo(() => new Map(products.map((p) => [p.listingId, p])), [products]);

  const panelLines = activeKey
    ? tabLines.filter((l) => (view === "urun" ? l.listingId === activeKey : l.buyer.id === activeKey))
    : [];
  const selectedLines = panelLines.filter((l) => selected.has(l.offerId));
  const selectedStates = selectedLines.map(lineState);

  const can = {
    respond: selectedStates.includes("PENDING"),
    send: selectedStates.some((s) => s === "UNSENT" || s === "PREPARING"),
    label: selectedLines.some((l) => l.status === "ACCEPTED"),
    remove: selectedStates.includes("READY"),
    cancel: selectedStates.some((s) => s === "UNSENT" || s === "PREPARING" || s === "READY"),
    pack:
      selectedLines.filter((l) => l.status === "ACCEPTED").length >= 2 &&
      new Set(selectedLines.map((l) => l.buyer.id)).size === 1,
  };

  const activeTitle = activeKey
    ? view === "urun"
      ? productById.get(activeKey)?.medicineName
      : pharmacyRows.find((r) => r.buyer.id === activeKey)?.buyer.name ??
        lines.find((l) => l.buyer.id === activeKey)?.buyer.name
    : null;

  function switchView(next: "urun" | "eczane") {
    setView(next);
    setActiveKey(null);
    setSelected(new Set());
  }

  function selectItem(key: string) {
    setActiveKey(key);
    setSelected(new Set());
    // Paneller alt alta dizildiğinde (dar ekran) seçilen kaydın paneline kaydır.
    if (!window.matchMedia("(min-width: 80rem)").matches) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function toggleLine(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === panelLines.length ? new Set() : new Set(panelLines.map((l) => l.offerId))
    );
  }

  function run(action: () => Promise<BulkResult>, okText: string) {
    setNotice(null);
    startTransition(async () => {
      try {
        const res = await action();
        const parts = [`${res.done} ${okText}`];
        if (res.errors.length) parts.push(res.errors.join(" · "));
        setNotice({ kind: res.errors.length && res.done === 0 ? "err" : "ok", text: parts.join(" — ") });
        setSelected(new Set());
        router.refresh();
      } catch {
        setNotice({ kind: "err", text: "İşlem sırasında bir hata oluştu, lütfen tekrar deneyin." });
      }
    });
  }

  const ids = selectedLines.map((l) => l.offerId);

  function printLabels() {
    setNotice(null);
    startTransition(async () => {
      const { shipmentIds } = await ensureShipmentsAction(ids);
      if (shipmentIds.length === 0) {
        setNotice({ kind: "err", text: "Etiket için kabul edilmiş gönderim seçin." });
        return;
      }
      router.push(`/shipments/labels?ids=${shipmentIds.join(",")}`);
    });
  }

  function packLabels() {
    setNotice(null);
    startTransition(async () => {
      const res = await bulkPackShipmentsAction(ids);
      if (res.error) {
        setNotice({ kind: "err", text: res.error });
        return;
      }
      router.push(`/shipments/labels?ids=${res.shipmentIds.join(",")}`);
    });
  }

  function exportExcel() {
    const rows = tabLines.map((l) => {
      const p = productById.get(l.listingId);
      return [
        p?.medicineName,
        p?.barkod,
        p?.groupName,
        l.buyer.name,
        l.buyer.gln,
        l.quantity,
        l.unitPrice,
        l.totalPrice,
        fmtDate(l.acceptedAt ?? l.createdAt),
        STATE_LABEL[lineState(l)],
        l.shipment?.code,
        l.shipment?.courierName,
        l.shipment?.barcodeCount ?? 0,
      ];
    });
    downloadCsv(
      `gonderimlerim-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Ürün", "Barkod", "Grup", "Eczane", "GLN", "Miktar", "Birim Fiyat", "Tutar", "Tarih", "Durum", "Sevkiyat Kodu", "Sevkiyatçı", "Karekod Sayısı"],
      rows
    );
  }

  const btn =
    "flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
          <button
            type="button"
            onClick={() => switchView("urun")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
              view === "urun" ? "bg-emerald-600 text-white" : "text-slate-600 dark:text-slate-300"
            }`}
          >
            <Package className="h-4 w-4" strokeWidth={1.75} />
            Ürüne Göre
          </button>
          <button
            type="button"
            onClick={() => switchView("eczane")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
              view === "eczane" ? "bg-emerald-600 text-white" : "text-slate-600 dark:text-slate-300"
            }`}
          >
            <Building2 className="h-4 w-4" strokeWidth={1.75} />
            Eczaneye Göre
          </button>
        </div>
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            strokeWidth={1.75}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={view === "urun" ? "Ürün adı veya barkod ile ara..." : "Eczane adı veya GLN ile ara..."}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={exportExcel}
          className="ml-auto flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <FileSpreadsheet className="h-4 w-4" strokeWidth={1.75} />
          Excel
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              setSelected(new Set());
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold ${
              tab === t.key
                ? "bg-orange-500 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {t.label}
            <span className={`rounded-full px-1.5 text-[10px] ${tab === t.key ? "bg-white/25" : "bg-slate-100 dark:bg-slate-800"}`}>
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h2 className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {view === "urun" ? "Ürün Gönderimleri" : "Eczane Gönderimleri"}
            <span className="ml-2 text-xs font-normal text-slate-500">
              {view === "urun" ? "Ürün seçin, ilgili eczaneleri " : "Eczane seçin, ilgili ürünleri "}
              <span className="xl:hidden">alttaki</span>
              <span className="hidden xl:inline">sağ</span> panelde yönetin.
            </span>
          </h2>
          <div className="max-h-[560px] overflow-y-auto">
            {view === "urun" ? (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Ürün</th>
                    <th className="px-3 py-2">Şart</th>
                    <th className="px-3 py-2">Net / Depo</th>
                    <th className="px-3 py-2 text-right">Dağıtılan</th>
                    <th className="px-3 py-2 text-right">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {productRows.map(({ product: p, distributed, total, open }) => (
                    <tr
                      key={p.listingId}
                      onClick={() => selectItem(p.listingId)}
                      className={`cursor-pointer border-b border-slate-200 dark:border-slate-800/60 ${
                        activeKey === p.listingId
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : open
                            ? "bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20"
                            : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20"
                      }`}
                    >
                      <td className="px-3 py-2">
                        <p className="font-semibold">{p.medicineName}</p>
                        <p className={activeKey === p.listingId ? "opacity-80" : "text-slate-500"}>
                          {fmtDate(p.createdAt)} · SKT {fmtDate(p.expiryDate)} · {p.groupName}
                        </p>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {p.terms}
                        {p.extra !== "—" && <p className="opacity-70">Ekstra {p.extra}</p>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <p className="font-semibold">{fmtMoney(p.netFiyat)}</p>
                        <p className="opacity-70">KDV&apos;siz {fmtMoney(priceWithoutVat(p.netFiyat, p.kdvOrani))}</p>
                        <p className="opacity-70">Depo {fmtMoney(p.birimFiyat)}</p>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {distributed}
                        {p.totalStock != null && <span className="opacity-60"> / {p.totalStock}</span>}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap font-semibold">{fmtMoney(total)}</td>
                    </tr>
                  ))}
                  {productRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-left sm:text-center text-slate-500">
                        Bu sekmede kayıt yok.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Eczane</th>
                    <th className="px-3 py-2">Yönetici / Mail</th>
                    <th className="px-3 py-2">Şehir / Adres</th>
                    <th className="px-3 py-2 text-right">Bekleyen</th>
                  </tr>
                </thead>
                <tbody>
                  {pharmacyRows.map(({ buyer, lineCount, openCount }) => (
                    <tr
                      key={buyer.id}
                      onClick={() => selectItem(buyer.id)}
                      className={`cursor-pointer border-b border-slate-200 dark:border-slate-800/60 ${
                        activeKey === buyer.id
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <td className="px-3 py-2">
                        <p className="font-semibold">{buyer.name}</p>
                        <p className="opacity-70">{buyer.gln ?? "—"}</p>
                      </td>
                      <td className="px-3 py-2">
                        <p>{buyer.contactName}</p>
                        <p className="opacity-70 break-all">{buyer.email}</p>
                      </td>
                      <td className="px-3 py-2">
                        <p>
                          {buyer.region}
                          {buyer.district ? ` / ${buyer.district}` : ""}
                        </p>
                        <p className="opacity-70">{buyer.address ?? "—"}</p>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={`rounded-full px-2 py-0.5 font-semibold ${
                            openCount > 0
                              ? "bg-orange-500/15 text-orange-700 dark:text-orange-400"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {openCount} / {lineCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {pharmacyRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-left sm:text-center text-slate-500">
                        Bu sekmede kayıt yok.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section
          ref={panelRef}
          className="scroll-mt-16 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 lg:scroll-mt-4"
        >
          <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {view === "urun" ? "Eczaneler" : "Ürünler"}
                {activeTitle && <span className="ml-1.5 font-normal text-slate-500">· {activeTitle}</span>}
              </h2>
              <span className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-orange-500 px-2 py-0.5 font-semibold text-white">
                  {selectedLines.length} kayıt seçili
                </span>
                {selectedLines.length > 0 && (
                  <button type="button" onClick={() => setSelected(new Set())} className="text-slate-500 hover:underline">
                    Temizle
                  </button>
                )}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={!can.respond || isPending}
                onClick={() => run(() => bulkRespondOffersAction(ids, true), "teklif kabul edildi")}
                className={`${btn} border-emerald-500/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10`}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2} />
                Kabul Et
              </button>
              <button
                type="button"
                disabled={!can.respond || isPending}
                onClick={() => run(() => bulkRespondOffersAction(ids, false), "teklif reddedildi")}
                className={`${btn} border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10`}
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
                Reddet
              </button>
              <button
                type="button"
                disabled={!can.send || isPending}
                onClick={() => run(() => bulkSendShipmentsAction(ids), "gönderim sevkiyata verildi")}
                className={`${btn} border-blue-500/50 bg-blue-600 text-white hover:bg-blue-500`}
              >
                <Send className="h-3.5 w-3.5" strokeWidth={1.75} />
                Gönder
              </button>
              <button
                type="button"
                disabled={!can.label || isPending}
                onClick={printLabels}
                className={`${btn} border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800`}
              >
                <Tag className="h-3.5 w-3.5" strokeWidth={1.75} />
                60x40 Etiket
              </button>
              <button
                type="button"
                disabled={!can.pack || isPending}
                onClick={packLabels}
                title="Aynı eczaneye giden seçili ürünleri tek koli etiketinde birleştirir"
                className={`${btn} border-violet-500/40 text-violet-700 dark:text-violet-400 hover:bg-violet-500/10`}
              >
                <Boxes className="h-3.5 w-3.5" strokeWidth={1.75} />
                Tek Kolide Etiketle
              </button>
              <button
                type="button"
                disabled={!can.remove || isPending}
                onClick={() => run(() => bulkRemoveFromShipmentAction(ids), "gönderim sevkiyattan çıkarıldı")}
                className={`${btn} border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10`}
              >
                <Undo2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                Sevkiyattan Çıkar
              </button>
              <button
                type="button"
                disabled={!can.cancel || isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      "Seçili gönderimler iptal edilecek ve tutarları alıcıların cari hesabına iade edilecek. Emin misiniz?"
                    )
                  ) {
                    run(() => bulkCancelOffersAction(ids), "gönderim iptal edildi");
                  }
                }}
                className={`${btn} border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10`}
              >
                <Ban className="h-3.5 w-3.5" strokeWidth={1.75} />
                Gönderimi İptal Et
              </button>
            </div>
            <p className="mt-2 flex items-start gap-1 text-[11px] text-slate-500">
              <Info className="mt-px h-3 w-3 shrink-0" strokeWidth={2} />
              Teklifi kabul ettiğiniz anda tutar cari hesaba işlenir. &quot;Gönder&quot; ya da etiket
              yazdırma ürünü sevkiyatçınızın ekranına düşürür.
            </p>
            {notice && (
              <p
                className={`mt-2 rounded-md px-3 py-2 text-xs ${
                  notice.kind === "ok"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-red-500/10 text-red-700 dark:text-red-400"
                }`}
              >
                {notice.text}
              </p>
            )}
          </div>

          {!activeKey ? (
            <p className="px-4 py-16 text-center text-sm text-slate-500">
              Lütfen <span className="xl:hidden">yukarıdaki listeden</span>
              <span className="hidden xl:inline">soldan</span> bir kayıt seçiniz.
            </p>
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 uppercase text-slate-500">
                  <tr>
                    <th className="w-8 px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label="Tümünü seç"
                        checked={panelLines.length > 0 && selected.size === panelLines.length}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="px-2 py-2">{view === "urun" ? "Eczane" : "Ürün"}</th>
                    <th className="px-2 py-2 text-right">Miktar / Tutar</th>
                    <th className="px-2 py-2">Durum / Tarih</th>
                    <th className="px-2 py-2">Karekod</th>
                  </tr>
                </thead>
                <tbody>
                  {panelLines.map((l) => {
                    const state = lineState(l);
                    const p = productById.get(l.listingId);
                    return (
                      <tr
                        key={l.offerId}
                        className={`border-b border-slate-200 dark:border-slate-800/60 ${
                          selected.has(l.offerId) ? "bg-orange-50 dark:bg-orange-500/10" : ""
                        }`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            aria-label="Seç"
                            checked={selected.has(l.offerId)}
                            onChange={() => toggleLine(l.offerId)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          {view === "urun" ? (
                            <>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{l.buyer.name}</p>
                              <p className="text-slate-500">{l.buyer.gln ?? "—"}</p>
                            </>
                          ) : (
                            <>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{p?.medicineName}</p>
                              <p className="text-slate-500">SKT {fmtDate(p?.expiryDate ?? null)}</p>
                            </>
                          )}
                          {l.message && <p className="italic text-slate-500">“{l.message}”</p>}
                        </td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{l.quantity} adet</p>
                          <p className="text-slate-500">{fmtMoney(l.totalPrice)}</p>
                        </td>
                        <td className="px-2 py-2">
                          <span className={`whitespace-nowrap rounded px-1.5 py-0.5 font-medium ${STATE_CLASS[state]}`}>
                            {STATE_LABEL[state]}
                          </span>
                          <p className="mt-0.5 text-slate-500">
                            {fmtDate(l.acceptedAt ?? l.createdAt)}
                            {l.shipment?.courierName ? ` · ${l.shipment.courierName}` : ""}
                          </p>
                          {l.shipment?.packageCode && (
                            <p className="font-mono text-[10px] text-violet-600 dark:text-violet-400">{l.shipment.packageCode}</p>
                          )}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {l.status !== "ACCEPTED" ? (
                              <span className="text-slate-400">—</span>
                            ) : l.shipment?.barcodeCount ? (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {l.shipment.barcodeCount} adet
                              </span>
                            ) : (
                              <Link
                                href={`/groups/${l.groupId}/listings/${l.listingId}/offers/${l.offerId}/prepare`}
                                className="flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline"
                              >
                                <QrCode className="h-3 w-3" strokeWidth={2} />
                                Eksik
                              </Link>
                            )}
                            <Link
                              href={`/groups/${l.groupId}/listings/${l.listingId}`}
                              title="İlana git"
                              className="ml-auto text-slate-400 hover:text-emerald-600"
                            >
                              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {panelLines.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-left sm:text-center text-slate-500">
                        Bu sekmede seçilen kayda ait gönderim yok.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
