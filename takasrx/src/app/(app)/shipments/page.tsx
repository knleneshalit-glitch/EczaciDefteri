import Link from "next/link";
import {
  Truck,
  PackageOpen,
  PackageCheck,
  Phone,
  CheckCircle2,
  MapPin,
  History,
  Search,
  ListChecks,
  Route,
  Tag,
  Undo2,
  Info,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePharmacy } from "@/lib/require-user";
import { istanbulDayStart, istanbulDateKey, addDays, formatTr } from "@/lib/dates";
import { shipmentStage, groupByPackage } from "@/lib/shipment-stage";
import { telHref } from "@/lib/phone";
import { foldTr } from "@/lib/search";
import { confirmReceiptFormAction, removeFromShipmentFormAction } from "@/app/actions/shipment-forms";

const TABS = [
  { key: "bugun", label: "Bugünün Sevkiyatı", Icon: Route },
  { key: "aktif", label: "Aktif Sevkiyat Listem", Icon: Truck },
  { key: "gecmis", label: "Geçmiş Sevkiyatlar", Icon: History },
  { key: "ara", label: "Sevkiyatta Ürün Arama", Icon: Search },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const shipmentInclude = {
  offer: { include: { listing: { include: { user: true } }, user: true } },
  courier: { select: { contactName: true, phone: true } },
} as const;

export default async function ShipmentsPage(props: PageProps<"/shipments">) {
  const pharmacy = await requirePharmacy();
  const sp = await props.searchParams;
  const tab = (TABS.some((t) => t.key === sp.tab) ? sp.tab : "bugun") as TabKey;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const days = [7, 30, 90].includes(Number(sp.gun)) ? Number(sp.gun) : 30;

  const [outgoing, incoming, assignments] = await Promise.all([
    prisma.shipment.findMany({
      where: { offer: { listing: { userId: pharmacy.id } } },
      include: shipmentInclude,
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.shipment.findMany({
      where: { offer: { userId: pharmacy.id } },
      include: shipmentInclude,
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.courierAssignment.findMany({
      where: { pharmacyId: pharmacy.id },
      include: { courier: { select: { contactName: true, phone: true } } },
    }),
  ]);

  const todayStart = istanbulDayStart();
  const isToday = (d: Date | null) => !!d && d >= todayStart;

  const visits = [
    ...outgoing.map((s) => s.pickedUpAt),
    ...incoming.map((s) => (s.buyerConfirmedAt ? null : s.deliveredAt)),
  ].filter((d): d is Date => !!d);
  const lastVisit = visits.length ? new Date(Math.max(...visits.map((d) => d.getTime()))) : null;

  const distribution = groupByPackage(
    incoming.filter((s) => (s.printedAt && s.status !== "TESLIM_EDILDI") || isToday(s.deliveredAt))
  );
  const collection = groupByPackage(
    outgoing.filter((s) => s.printedAt && (s.status === "HAZIRLANIYOR" || isToday(s.pickedUpAt)))
  );
  const activeOutgoing = groupByPackage(outgoing.filter((s) => s.printedAt && s.status !== "TESLIM_EDILDI"));
  const activeIncoming = groupByPackage(incoming.filter((s) => s.printedAt && s.status !== "TESLIM_EDILDI"));

  const historySince = addDays(todayStart, -days + 1);
  const history = groupByPackage(
    [...outgoing, ...incoming]
      .filter((s) => s.status === "TESLIM_EDILDI" && s.deliveredAt && s.deliveredAt >= historySince)
      .sort((a, b) => b.deliveredAt!.getTime() - a.deliveredAt!.getTime())
  );

  const needle = foldTr(q);
  const searchResults = needle
    ? [...outgoing, ...incoming].filter((s) => {
        const hay = foldTr(
          [
            s.offer.listing.medicineName,
            s.offer.listing.barkod ?? "",
            s.code,
            s.packageCode ?? "",
            s.offer.user.pharmacyName ?? "",
            s.offer.listing.user.pharmacyName ?? "",
          ].join(" ")
        );
        return hay.includes(needle);
      })
    : [];

  const card = "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <Truck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Sevkiyat Takibi
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Eczanenize gelen ve eczanenizden çıkan paketleri, sevkiyatçınızı ve geçmiş teslimatları
        buradan izleyin.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map(({ key, label, Icon }) => (
          <Link
            key={key}
            href={key === "bugun" ? "/shipments" : `/shipments?tab=${key}`}
            className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold ${
              tab === key
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-orange-400"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {label}
          </Link>
        ))}
      </div>

      {tab === "bugun" && (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className={`${card} flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200`}>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
              {lastVisit
                ? isToday(lastVisit)
                  ? `Sevkiyat aracı bugün ${formatTr(lastVisit, true).split(" ").pop()} saatinde eczanenize uğradı.`
                  : `Sevkiyat aracımız ${formatTr(lastVisit)} tarihinde eczanenize gelmiştir.`
                : "Henüz eczanenize sevkiyat aracı uğramadı."}
            </p>
            <div className="flex flex-wrap gap-2">
              {assignments.length === 0 ? (
                <Link
                  href="/couriers"
                  className="rounded-full border border-dashed border-slate-400 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:border-emerald-500"
                >
                  Sevkiyatçı ekleyin →
                </Link>
              ) : (
                assignments.map((a) => (
                  <span
                    key={a.id}
                    className="flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300"
                  >
                    <Phone className="h-3.5 w-3.5" strokeWidth={2} />
                    Sevkiyatçınız: {a.courier.contactName}
                    {a.courier.phone && (
                      <a href={telHref(a.courier.phone)} className="underline">
                        {a.courier.phone}
                      </a>
                    )}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className={`${card} border-l-4 border-l-blue-600`}>
              <h2 className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-semibold text-blue-700 dark:text-blue-400">
                <span className="flex items-center gap-1.5">
                  <PackageOpen className="h-4 w-4" strokeWidth={1.75} />
                  Dağıtım Listesi (bana gelecekler)
                </span>
                <span className="rounded-full border border-blue-500/40 px-2 py-0.5 text-xs">{distribution.length} paket</span>
              </h2>
              <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto p-3">
                {distribution.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Bugün size gelecek paket yok.</p>}
                {distribution.map(({ key, items }) => {
                  const stage = shipmentStage(items[0]);
                  const sender = items[0].offer.listing.user;
                  const pending = items.filter((s) => s.status !== "TESLIM_EDILDI").map((s) => s.id);
                  return (
                    <div key={key} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="text-xs">
                          {items.map((s) => (
                            <p key={s.id} className="font-semibold text-slate-900 dark:text-slate-100">
                              {s.offer.quantity} X {s.offer.listing.medicineName}
                            </p>
                          ))}
                          <p className="mt-0.5 text-slate-500">Koli: 1/1 · Gönderen: {sender.pharmacyName ?? sender.contactName}</p>
                          {items[0].courier && (
                            <p className="text-slate-500">
                              Sevkiyatçı: {items[0].courier.contactName}
                              {items[0].courier.phone ? ` · ${items[0].courier.phone}` : ""}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={`/shipments/track/${items[0].packageCode ?? items[0].code}`}
                            className="flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-500/20"
                          >
                            <MapPin className="h-3 w-3" strokeWidth={2} />
                            Sevkiyatı Takip Et
                          </Link>
                          <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${stage.className}`}>{stage.label}</span>
                          {pending.length > 0 && (
                            <form action={confirmReceiptFormAction.bind(null, pending)}>
                              <button className="flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500">
                                <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                                Teslim Aldım
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={`${card} border-l-4 border-l-orange-500`}>
              <h2 className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-semibold text-orange-600 dark:text-orange-400">
                <span className="flex items-center gap-1.5">
                  <PackageCheck className="h-4 w-4" strokeWidth={1.75} />
                  Toplama Listesi (benden çıkanlar)
                </span>
                <span className="rounded-full border border-orange-500/40 px-2 py-0.5 text-xs">{collection.length} paket</span>
              </h2>
              <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto p-3">
                {collection.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Bugün toplanacak paket yok.</p>}
                {collection.map(({ key, items }) => {
                  const stage = shipmentStage(items[0]);
                  const buyer = items[0].offer.user;
                  return (
                    <div key={key} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="text-xs">
                          {items.map((s) => (
                            <p key={s.id} className="font-semibold text-slate-900 dark:text-slate-100">
                              {s.offer.quantity} X {s.offer.listing.medicineName}
                            </p>
                          ))}
                          <p className="mt-0.5 text-slate-500">Koli: 1/1 · Alıcı: {buyer.pharmacyName ?? buyer.contactName}</p>
                          <p className="text-slate-500">Sevkiyat Çağırma Tarihi: {formatTr(items[0].printedAt, true)}</p>
                          {items[0].pickedUpAt && (
                            <p className="text-slate-500">Sürücü Teslim Alma Tarihi: {formatTr(items[0].pickedUpAt, true)}</p>
                          )}
                        </div>
                        <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${stage.className}`}>{stage.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <Info className="h-3.5 w-3.5" strokeWidth={2} />
            Rota planlaması aksamasın diye sevkiyatçıdan rota dışı ekstra uğrama talebinde bulunmayın.
          </p>
        </>
      )}

      {tab === "aktif" && (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <section className={card}>
            <h2 className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Gönderimlerim ({activeOutgoing.length} koli)
            </h2>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/60 uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Gidecek Yer</th>
                  <th className="px-3 py-2">Ürünler</th>
                  <th className="px-3 py-2">Durum</th>
                  <th className="px-3 py-2">Çağırma</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {activeOutgoing.map(({ key, items }) => {
                  const stage = shipmentStage(items[0]);
                  const buyer = items[0].offer.user;
                  return (
                    <tr key={key} className="border-t border-slate-200 dark:border-slate-800/60 align-top">
                      <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">
                        {buyer.pharmacyName ?? buyer.contactName}
                        <p className="font-normal text-slate-500">Koli 1/1</p>
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                        {items.map((s) => (
                          <p key={s.id}>
                            {s.offer.quantity} X {s.offer.listing.medicineName}
                          </p>
                        ))}
                        <p className="text-slate-500">Toplam {items.reduce((sum, s) => sum + s.offer.quantity, 0)} adet</p>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`whitespace-nowrap rounded px-1.5 py-0.5 font-semibold ${stage.className}`}>{stage.label}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">{formatTr(items[0].printedAt, true)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col items-end gap-1">
                          <Link
                            href={`/shipments/labels?ids=${items.map((s) => s.id).join(",")}`}
                            className="flex items-center gap-1 whitespace-nowrap rounded-md bg-blue-600 px-2 py-1 font-semibold text-white hover:bg-blue-500"
                          >
                            <Tag className="h-3 w-3" strokeWidth={2} />
                            Gönderim Etiketi
                          </Link>
                          {items[0].status === "HAZIRLANIYOR" && (
                            <form action={removeFromShipmentFormAction.bind(null, items.map((s) => s.offerId))}>
                              <button className="flex items-center gap-1 whitespace-nowrap rounded-md bg-red-500/10 px-2 py-1 font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20">
                                <Undo2 className="h-3 w-3" strokeWidth={2} />
                                Sevkiyattan Kaldır
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {activeOutgoing.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      Yolda olan gönderiminiz yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className={card}>
            <h2 className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Bana Gelecekler ({activeIncoming.length} koli)
            </h2>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/60 uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Gönderen</th>
                  <th className="px-3 py-2">Ürünler</th>
                  <th className="px-3 py-2">Durum</th>
                  <th className="px-3 py-2">Göndericiden Alındı</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {activeIncoming.map(({ key, items }) => {
                  const stage = shipmentStage(items[0]);
                  const sender = items[0].offer.listing.user;
                  return (
                    <tr key={key} className="border-t border-slate-200 dark:border-slate-800/60 align-top">
                      <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">
                        {sender.pharmacyName ?? sender.contactName}
                        <p className="font-normal text-slate-500">Koli 1/1</p>
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                        {items.map((s) => (
                          <p key={s.id}>
                            {s.offer.quantity} X {s.offer.listing.medicineName}
                          </p>
                        ))}
                        <p className="text-slate-500">Çağırma: {formatTr(items[0].printedAt, true)}</p>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`whitespace-nowrap rounded px-1.5 py-0.5 font-semibold ${stage.className}`}>
                          {stage.key === "READY" ? "Teslim Alınacak" : stage.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">{formatTr(items[0].pickedUpAt, true)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col items-end gap-1">
                          <Link
                            href={`/shipments/track/${items[0].packageCode ?? items[0].code}`}
                            className="flex items-center gap-1 whitespace-nowrap rounded-md bg-blue-500/10 px-2 py-1 font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-500/20"
                          >
                            <MapPin className="h-3 w-3" strokeWidth={2} />
                            Takip Et
                          </Link>
                          <form action={confirmReceiptFormAction.bind(null, items.map((s) => s.id))}>
                            <button className="flex items-center gap-1 whitespace-nowrap rounded-md bg-emerald-600 px-2 py-1 font-semibold text-white hover:bg-emerald-500">
                              <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                              Teslim Aldım
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {activeIncoming.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      Size gelmekte olan paket yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {tab === "gecmis" && (
        <section className={`${card} mt-6`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <ListChecks className="h-4 w-4" strokeWidth={1.75} />
              Son {days} günde tamamlanan sevkiyatlar ({history.length} koli)
            </h2>
            <div className="flex gap-1 text-xs">
              {[7, 30, 90].map((d) => (
                <Link
                  key={d}
                  href={`/shipments?tab=gecmis&gun=${d}`}
                  className={`rounded-md px-2.5 py-1 font-semibold ${
                    days === d ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {d} gün
                </Link>
              ))}
            </div>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/60 uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Teslim Tarihi</th>
                <th className="px-3 py-2">Yön</th>
                <th className="px-3 py-2">Ürünler</th>
                <th className="px-3 py-2">Karşı Eczane</th>
                <th className="px-3 py-2">Sevkiyatçı</th>
                <th className="px-3 py-2">Teslim</th>
              </tr>
            </thead>
            <tbody>
              {history.map(({ key, items }) => {
                const s = items[0];
                const isOutgoing = s.offer.listing.userId === pharmacy.id;
                const other = isOutgoing ? s.offer.user : s.offer.listing.user;
                return (
                  <tr key={key} className="border-t border-slate-200 dark:border-slate-800/60 align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-400">{formatTr(s.deliveredAt, true)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 font-semibold ${
                          isOutgoing ? "bg-orange-500/10 text-orange-700 dark:text-orange-400" : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                        }`}
                      >
                        {isOutgoing ? "Giden" : "Gelen"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-800 dark:text-slate-200">
                      {items.map((i) => (
                        <p key={i.id}>
                          {i.offer.quantity} X {i.offer.listing.medicineName}
                        </p>
                      ))}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{other.pharmacyName ?? other.contactName}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{s.courier?.contactName ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`whitespace-nowrap rounded px-1.5 py-0.5 font-semibold ${shipmentStage(s).className}`}>
                        {shipmentStage(s).label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    Bu dönemde tamamlanan sevkiyat yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {tab === "ara" && (
        <section className={`${card} mt-6 p-4`}>
          <form className="flex flex-wrap gap-2">
            <input type="hidden" name="tab" value="ara" />
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
              <input
                name="q"
                defaultValue={q}
                placeholder="Ürün adı, barkod, sevkiyat/koli kodu veya eczane adı..."
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <button className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400">Ara</button>
          </form>
          {q && (
            <table className="mt-4 w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/60 uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Ürün</th>
                  <th className="px-3 py-2">Yön / Karşı Eczane</th>
                  <th className="px-3 py-2">Kod</th>
                  <th className="px-3 py-2">Durum</th>
                  <th className="px-3 py-2">Son Hareket</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {searchResults.map((s) => {
                  const isOutgoing = s.offer.listing.userId === pharmacy.id;
                  const other = isOutgoing ? s.offer.user : s.offer.listing.user;
                  const stage = shipmentStage(s);
                  const last = s.deliveredAt ?? s.pickedUpAt ?? s.printedAt ?? s.createdAt;
                  return (
                    <tr key={s.id} className="border-t border-slate-200 dark:border-slate-800/60">
                      <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">
                        {s.offer.quantity} X {s.offer.listing.medicineName}
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                        {isOutgoing ? "Giden → " : "Gelen ← "}
                        {other.pharmacyName ?? other.contactName}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                        {s.code}
                        {s.packageCode && <p>{s.packageCode}</p>}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`whitespace-nowrap rounded px-1.5 py-0.5 font-semibold ${stage.className}`}>{stage.label}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">{formatTr(last, true)}</td>
                      <td className="px-3 py-2 text-right">
                        <Link href={`/shipments/track/${s.packageCode ?? s.code}`} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                          Takip Et
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {searchResults.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                      &quot;{q}&quot; ile eşleşen sevkiyat bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>
      )}

      <p className="mt-6 text-xs text-slate-500">
        Bugün: {istanbulDateKey(new Date()).split("-").reverse().join(".")} · Gönderim hazırlamak için{" "}
        <Link href="/offers/received" className="text-emerald-600 dark:text-emerald-400 hover:underline">
          Gönderimlerim
        </Link>{" "}
        ekranını kullanın.
      </p>
    </div>
  );
}
