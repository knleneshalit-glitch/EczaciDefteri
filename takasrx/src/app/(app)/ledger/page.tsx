import Link from "next/link";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Search, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { effectiveUnitPrice, priceWithoutVat } from "@/lib/pricing";
import { analyzePurchase } from "@/lib/earnings";
import { istanbulDateKey, istanbulDayStartFromKey, addDays, formatTr } from "@/lib/dates";
import ExportCsvButton from "@/components/ExportCsvButton";

const TABS = [
  { key: "urunler", label: "Alınan & Dağıtılan Ürünler" },
  { key: "bakiye", label: "Bakiye Değişimi" },
] as const;

function isDateKey(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function money(n: number) {
  return `${n.toFixed(2)} ₺`;
}

function entryLabel(e: { type: string; amount: number; note: string | null }) {
  if (e.type === "INTEREST") return "Grup Yükü (Valör)";
  if (e.type === "MANUAL") return e.note?.toLocaleLowerCase("tr-TR").includes("yıl sonu") ? "Yıl Sonu Mahsuplaşması" : "Manuel Düzeltme";
  if (e.note?.startsWith("İptal edilen gönderim")) return e.amount > 0 ? "İptal İadesi" : "İptal Kesintisi";
  return e.amount < 0 ? "Alım" : "Dağıtım (Satış)";
}

export default async function LedgerPage(props: PageProps<"/ledger">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const tab = sp.tab === "bakiye" ? "bakiye" : "urunler";

  const todayKey = istanbulDateKey(new Date());
  const bas = isDateKey(sp.bas) ? sp.bas : `${todayKey.slice(0, 7)}-01`;
  const bit = isDateKey(sp.bit) ? sp.bit : todayKey;
  const from = istanbulDayStartFromKey(bas);
  const to = addDays(istanbulDayStartFromKey(bit), 1);

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    include: { group: { select: { id: true, name: true } } },
    orderBy: { group: { name: "asc" } },
  });
  const grup = typeof sp.grup === "string" && memberships.some((m) => m.groupId === sp.grup) ? sp.grup : "";

  const tabHref = (key: string) => {
    const params = new URLSearchParams({ tab: key, bas, bit, ...(grup ? { grup } : {}) });
    return `/ledger?${params.toString()}`;
  };

  // --- Alınan & Dağıtılan Ürünler ---
  const offers =
    tab === "urunler"
      ? await prisma.offer.findMany({
          where: {
            status: "ACCEPTED",
            ...(grup ? { listing: { groupId: grup } } : {}),
            AND: [
              { OR: [{ userId: user.id }, { listing: { userId: user.id } }] },
              {
                OR: [
                  { acceptedAt: { gte: from, lt: to } },
                  { acceptedAt: null, createdAt: { gte: from, lt: to } },
                ],
              },
            ],
          },
          include: {
            listing: { include: { group: { select: { name: true, monthlyInterestRate: true } }, user: true } },
            user: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const productRows = offers.map((o) => {
    const isBuyer = o.userId === user.id;
    const l = o.listing;
    const amount = o.totalPrice ?? 0;
    const analysis = isBuyer
      ? analyzePurchase({
          amount: -amount,
          offer: {
            quantity: o.quantity,
            listing: {
              birimFiyat: l.birimFiyat,
              totalStock: l.totalStock,
              medicineName: l.medicineName,
              group: { monthlyInterestRate: l.group.monthlyInterestRate },
            },
          },
        })
      : null;
    const hasBonus =
      l.dealBonusQuantity != null && l.totalStock != null && l.dealBonusQuantity > 0 && l.dealBonusQuantity < l.totalStock;
    return {
      offer: o,
      isBuyer,
      amount,
      net: o.unitPrice ?? effectiveUnitPrice(l),
      mf: hasBonus ? `${l.totalStock! - l.dealBonusQuantity!}+${l.dealBonusQuantity}` : "—",
      kazanc: analysis && analysis.discountedDepoTutari > 0 ? analysis.saving : null,
      kazancYuzde:
        analysis && analysis.discountedDepoTutari > 0 ? (analysis.saving / analysis.discountedDepoTutari) * 100 : null,
      discountedDepoTutari: analysis?.discountedDepoTutari ?? 0,
    };
  });

  const totals = productRows.reduce(
    (acc, r) => {
      if (r.isBuyer) {
        acc.alim += r.amount;
        if (r.kazanc != null) {
          acc.kazancliAlim += r.amount;
          acc.kazanc += r.kazanc;
          acc.kazancliDepo += r.discountedDepoTutari;
        }
      } else {
        acc.dagitim += r.amount;
      }
      return acc;
    },
    { alim: 0, dagitim: 0, kazancliAlim: 0, kazanc: 0, kazancliDepo: 0 }
  );
  const kazancYuzde = totals.kazancliDepo > 0 ? (totals.kazanc / totals.kazancliDepo) * 100 : 0;

  // --- Bakiye Değişimi ---
  const groupFilter = grup ? { groupId: grup } : {};
  const [opening, entries] =
    tab === "bakiye"
      ? await Promise.all([
          prisma.ledgerEntry.aggregate({
            where: { userId: user.id, createdAt: { lt: from }, ...groupFilter },
            _sum: { amount: true },
          }),
          prisma.ledgerEntry.findMany({
            where: { userId: user.id, createdAt: { gte: from, lt: to }, ...groupFilter },
            include: { group: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          }),
        ])
      : [null, []];
  const openingBalance = opening?._sum.amount ?? 0;
  const balanceRows = entries.reduce<{ entry: (typeof entries)[number]; balance: number }[]>((rows, e) => {
    const previous = rows.length ? rows[rows.length - 1].balance : openingBalance;
    rows.push({ entry: e, balance: previous + e.amount });
    return rows;
  }, []);

  const inputClass =
    "rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
            Cari Hareketler
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Seçtiğiniz tarih aralığındaki alım, dağıtım ve bakiye hareketleriniz.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Renk Bilgisi:
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> Alım
            </span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Dağıtım
            </span>
          </span>
          {tab === "urunler" ? (
            <ExportCsvButton
              filename="cari-hareketler-urunler"
              headers={["Tarih", "Yön", "Ürün", "Grup", "Alıcı", "Dağıtıcı", "Tutar", "Depocu Fiyatı", "MF", "İskonto %", "İskonto ₺", "KDV'li Net", "KDV'siz Net", "KDV %", "Miktar", "Kazanç ₺", "Kazanç %"]}
              rows={productRows.map((r) => [
                (r.offer.acceptedAt ?? r.offer.createdAt).toLocaleDateString("tr-TR"),
                r.isBuyer ? "Alım" : "Dağıtım",
                r.offer.listing.medicineName,
                r.offer.listing.group.name,
                r.offer.user.pharmacyName ?? r.offer.user.contactName,
                r.offer.listing.user.pharmacyName ?? r.offer.listing.user.contactName,
                r.isBuyer ? -r.amount : r.amount,
                r.offer.listing.birimFiyat,
                r.mf,
                r.offer.listing.ekstraIskontoYuzde,
                r.offer.listing.ekstraIndirim,
                r.net,
                priceWithoutVat(r.net, r.offer.listing.kdvOrani),
                r.offer.listing.kdvOrani,
                r.offer.quantity,
                r.kazanc,
                r.kazancYuzde,
              ])}
            />
          ) : (
            <ExportCsvButton
              filename="cari-hareketler-bakiye"
              headers={["Tarih", "Grup", "Hareket", "Açıklama", "Tutar", "Bakiye"]}
              rows={balanceRows.map(({ entry, balance }) => [
                entry.createdAt.toLocaleDateString("tr-TR"),
                entry.group.name,
                entryLabel(entry),
                entry.note,
                entry.amount,
                balance,
              ])}
            />
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={tabHref(t.key)}
            className={`rounded-lg border px-3.5 py-2 text-sm font-semibold ${
              tab === t.key
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-orange-400"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <form className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
        <input type="hidden" name="tab" value={tab} />
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Başlangıç
          <input type="date" name="bas" defaultValue={bas} className={`${inputClass} mt-1 block`} />
        </label>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Bitiş
          <input type="date" name="bit" defaultValue={bit} className={`${inputClass} mt-1 block`} />
        </label>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Grup
          <select name="grup" defaultValue={grup} className={`${inputClass} mt-1 block`}>
            <option value="">Tüm Gruplarım</option>
            {memberships.map((m) => (
              <option key={m.groupId} value={m.groupId}>
                {m.group.name}
              </option>
            ))}
          </select>
        </label>
        <button className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
          <Search className="h-4 w-4" strokeWidth={2} />
          Sorgula
        </button>
      </form>

      {tab === "urunler" ? (
        <>
          <p className="mt-3 flex items-center gap-1.5 rounded-md border border-amber-400/50 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            Herhangi bir iskonto/MF girilmemiş tekliflerden yapılan alımlar yüzdelik kazanç hesabına yansımaz. Bakiye
            transferi teklifleri de kazanç hesabına yansımamaktadır.
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2 text-xs font-semibold">
            <span className="rounded-md border border-red-400/50 bg-red-500/5 px-2.5 py-1 text-red-700 dark:text-red-400">Alım: {money(totals.alim)}</span>
            <span className="rounded-md border border-emerald-400/50 bg-emerald-500/5 px-2.5 py-1 text-emerald-700 dark:text-emerald-400">Dağıtım: {money(totals.dagitim)}</span>
            <span className="rounded-md border border-teal-400/50 bg-teal-500/5 px-2.5 py-1 text-teal-700 dark:text-teal-400">Kazançlı Alım: {money(totals.kazancliAlim)}</span>
            <span className="rounded-md border border-teal-400/50 bg-teal-500/5 px-2.5 py-1 text-teal-700 dark:text-teal-400">Kazanç (TL): {money(totals.kazanc)}</span>
            <span className="rounded-md border border-teal-400/50 bg-teal-500/5 px-2.5 py-1 text-teal-700 dark:text-teal-400">Kazanç (%): %{kazancYuzde.toFixed(2)}</span>
          </div>

          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Tarih</th>
                  <th className="px-3 py-2.5">Ürün Adı</th>
                  <th className="px-3 py-2.5">Alıcı / Dağıtıcı</th>
                  <th className="px-3 py-2.5 text-right">Alım / Dağıtım</th>
                  <th className="px-3 py-2.5">Depocu Fiyatı · MF · İskonto</th>
                  <th className="px-3 py-2.5 text-right">Net Fiyat</th>
                  <th className="px-3 py-2.5 text-right">Miktar</th>
                  <th className="px-3 py-2.5 text-right">Kazanç</th>
                </tr>
              </thead>
              <tbody>
                {productRows.map((r) => {
                  const l = r.offer.listing;
                  return (
                    <tr
                      key={r.offer.id}
                      className={`border-b border-slate-200 dark:border-slate-800/60 last:border-0 border-l-4 ${
                        r.isBuyer ? "border-l-red-500" : "border-l-emerald-500"
                      }`}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {formatTr(r.offer.acceptedAt ?? r.offer.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{l.medicineName}</p>
                        <p className="text-slate-500">{l.group.name}</p>
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                        <p>
                          <span className="text-slate-500">Alıcı:</span> {r.offer.user.pharmacyName ?? r.offer.user.contactName}
                        </p>
                        <p>
                          <span className="text-slate-500">Dağıtıcı:</span> {l.user.pharmacyName ?? l.user.contactName}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <span
                          className={`flex items-center justify-end gap-1 font-bold ${
                            r.isBuyer ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {r.isBuyer ? (
                            <ArrowDownCircle className="h-3.5 w-3.5" strokeWidth={2} />
                          ) : (
                            <ArrowUpCircle className="h-3.5 w-3.5" strokeWidth={2} />
                          )}
                          {r.isBuyer ? "−" : "+"}
                          {money(r.amount)}
                        </span>
                        <span className="text-slate-500">{r.isBuyer ? "Alım" : "Dağıtım"}</span>
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                        <p>{l.birimFiyat != null ? money(l.birimFiyat) : "—"}</p>
                        <p className="text-slate-500">
                          MF {r.mf}
                          {l.ekstraIskontoYuzde ? ` · %${l.ekstraIskontoYuzde}` : ""}
                          {l.ekstraIndirim ? ` · ${l.ekstraIndirim.toFixed(0)} ₺` : ""}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{r.net != null ? money(r.net) : "—"}</p>
                        <p className="text-slate-500">
                          KDV&apos;siz {money(priceWithoutVat(r.net, l.kdvOrani) ?? 0)} · %{l.kdvOrani}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-800 dark:text-slate-200">{r.offer.quantity}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {r.kazanc != null ? (
                          <>
                            <p className="font-bold text-emerald-600 dark:text-emerald-400">{money(r.kazanc)}</p>
                            <p className="text-slate-500">%{r.kazancYuzde!.toFixed(2)}</p>
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {productRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-left sm:text-center text-sm text-slate-500">
                      Bu tarih aralığında kayıt bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Tarih</th>
                <th className="px-4 py-2.5">Grup</th>
                <th className="px-4 py-2.5">Hareket</th>
                <th className="px-4 py-2.5">Açıklama</th>
                <th className="px-4 py-2.5 text-right">Tutar</th>
                <th className="px-4 py-2.5 text-right">Bakiye</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-800/30">
                <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Dönem başı bakiyesi ({formatTr(from)})
                </td>
                <td className="px-4 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">{money(openingBalance)}</td>
              </tr>
              {balanceRows.map(({ entry, balance }) => (
                <tr key={entry.id} className="border-b border-slate-200 dark:border-slate-800/60 last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap text-slate-600 dark:text-slate-400">{formatTr(entry.createdAt, true)}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{entry.group.name}</td>
                  <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">{entryLabel(entry)}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{entry.note ?? "—"}</td>
                  <td
                    className={`px-4 py-2 text-right font-semibold ${
                      entry.amount < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {entry.amount > 0 ? "+" : ""}
                    {money(entry.amount)}
                  </td>
                  <td className={`px-4 py-2 text-right font-semibold ${balance < 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"}`}>
                    {money(balance)}
                  </td>
                </tr>
              ))}
              {balanceRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-left sm:text-center text-sm text-slate-500">
                    Bu tarih aralığında bakiye hareketi yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
