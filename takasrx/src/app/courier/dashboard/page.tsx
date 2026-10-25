import Link from "next/link";
import {
  Truck,
  Route,
  History,
  Search,
  MapPin,
  Phone,
  PackageOpen,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCourier } from "@/lib/require-user";
import { courierPickUpAction, courierDeliverAction } from "@/app/actions/shipments";
import { istanbulDayStart, istanbulDateKey, istanbulDayStartFromKey, addDays, formatTr } from "@/lib/dates";
import { groupByPackage, shipmentStage } from "@/lib/shipment-stage";
import { telHref } from "@/lib/phone";
import { foldTr } from "@/lib/search";

const TABS = [
  { key: "rota", label: "Bugünün Sevkiyat Rotası", Icon: Route },
  { key: "aktif", label: "Aktif Sevkiyat Listem", Icon: Truck },
  { key: "gecmis", label: "Geçmiş Sevkiyat Rotaları", Icon: History },
  { key: "ara", label: "Sevkiyatta Ürün Arama", Icon: Search },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const include = {
  offer: { include: { listing: { include: { user: true } }, user: true } },
} as const;

type Pharmacy = {
  id: string;
  pharmacyName: string | null;
  contactName: string;
  region: string;
  district: string | null;
  address: string | null;
  phone: string | null;
};

export default async function CourierDashboardPage(props: PageProps<"/courier/dashboard">) {
  const courier = await requireCourier();
  const sp = await props.searchParams;
  const tab = (TABS.some((t) => t.key === sp.tab) ? sp.tab : "rota") as TabKey;
  const durum = sp.durum === "ugranan" || sp.durum === "ugranmayan" ? sp.durum : "tumu";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const todayStart = istanbulDayStart();
  const historySince = addDays(todayStart, -13);

  const assignments = await prisma.courierAssignment.findMany({
    where: { courierId: courier.id },
    select: { pharmacyId: true },
  });
  const pharmacyIds = assignments.map((a) => a.pharmacyId);

  const [toPickUp, inHand, recent] = await Promise.all([
    prisma.shipment.findMany({
      where: { status: "HAZIRLANIYOR", printedAt: { not: null }, offer: { listing: { userId: { in: pharmacyIds } } } },
      include,
      orderBy: { printedAt: "asc" },
    }),
    prisma.shipment.findMany({
      where: { courierId: courier.id, status: "TESLIM_ALINDI" },
      include,
      orderBy: { pickedUpAt: "asc" },
    }),
    prisma.shipment.findMany({
      where: {
        courierId: courier.id,
        OR: [{ pickedUpAt: { gte: historySince } }, { deliveredAt: { gte: historySince } }],
      },
      include,
      orderBy: { pickedUpAt: "desc" },
    }),
  ]);

  // Bugünün rotası: alınacak paketlerin göndericileri + elimdeki paketlerin alıcıları.
  type Stop = {
    pharmacy: Pharmacy;
    pickups: typeof toPickUp;
    deliveries: typeof inHand;
    visitedAt: Date | null;
  };
  const stops = new Map<string, Stop>();
  const stopFor = (p: Pharmacy) => {
    const existing = stops.get(p.id);
    if (existing) return existing;
    const created: Stop = { pharmacy: p, pickups: [], deliveries: [], visitedAt: null };
    stops.set(p.id, created);
    return created;
  };
  for (const s of toPickUp) stopFor(s.offer.listing.user).pickups.push(s);
  for (const s of inHand) stopFor(s.offer.user).deliveries.push(s);
  for (const s of recent) {
    const events: [Pharmacy, Date | null][] = [
      [s.offer.listing.user, s.pickedUpAt],
      [s.offer.user, s.deliveredAt],
    ];
    for (const [p, at] of events) {
      if (at && at >= todayStart) {
        const stop = stopFor(p);
        if (!stop.visitedAt || at > stop.visitedAt) stop.visitedAt = at;
      }
    }
  }
  const allStops = Array.from(stops.values());
  const isPending = (s: Stop) => s.pickups.length > 0 || s.deliveries.length > 0;
  const visitedCount = allStops.filter((s) => s.visitedAt && !isPending(s)).length;
  const pendingCount = allStops.filter(isPending).length;
  const routeStops = allStops
    .filter((s) => (durum === "ugranan" ? s.visitedAt && !isPending(s) : durum === "ugranmayan" ? isPending(s) : true))
    .sort((a, b) => {
      if (isPending(a) !== isPending(b)) return isPending(a) ? -1 : 1;
      const da = `${a.pharmacy.district ?? ""} ${a.pharmacy.pharmacyName ?? ""}`;
      const db = `${b.pharmacy.district ?? ""} ${b.pharmacy.pharmacyName ?? ""}`;
      return da.localeCompare(db, "tr");
    });

  // Geçmiş rotalar: gün bazında uğranan eczane ve paket sayıları.
  const dayStats = new Map<string, { stops: Set<string>; pickups: number; deliveries: number }>();
  for (const s of recent) {
    const add = (at: Date | null, pharmacyId: string, kind: "pickups" | "deliveries") => {
      if (!at || at < historySince) return;
      const key = istanbulDateKey(at);
      const row = dayStats.get(key) ?? { stops: new Set<string>(), pickups: 0, deliveries: 0 };
      row.stops.add(pharmacyId);
      row[kind]++;
      dayStats.set(key, row);
    };
    add(s.pickedUpAt, s.offer.listing.userId, "pickups");
    add(s.deliveredAt, s.offer.userId, "deliveries");
  }
  const days = Array.from(dayStats.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  const selectedDay = typeof sp.gun === "string" && dayStats.has(sp.gun) ? sp.gun : null;
  const selectedDayEvents = selectedDay
    ? recent.filter((s) => {
        const start = istanbulDayStartFromKey(selectedDay);
        const end = addDays(start, 1);
        const inDay = (d: Date | null) => !!d && d >= start && d < end;
        return inDay(s.pickedUpAt) || inDay(s.deliveredAt);
      })
    : [];

  const needle = foldTr(q);
  const searchPool = [...toPickUp, ...inHand, ...recent];
  const seen = new Set<string>();
  const searchResults = needle
    ? searchPool.filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return foldTr(
          [
            s.offer.listing.medicineName,
            s.offer.listing.barkod ?? "",
            s.code,
            s.packageCode ?? "",
            s.offer.user.pharmacyName ?? "",
            s.offer.listing.user.pharmacyName ?? "",
          ].join(" ")
        ).includes(needle);
      })
    : [];

  const card = "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";

  function PharmacyLine({ p }: { p: Pharmacy }) {
    return (
      <div className="text-xs text-slate-500">
        <p className="flex items-center gap-1">
          <MapPin className="h-3 w-3" strokeWidth={2} />
          {p.region}
          {p.district ? ` / ${p.district}` : ""} · {p.address ?? "Adres girilmemiş"}
        </p>
        {p.phone && (
          <a href={telHref(p.phone)} className="mt-0.5 flex w-fit items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
            <Phone className="h-3 w-3" strokeWidth={2} />
            {p.phone}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <Truck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Sevkiyat Paneli
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {pharmacyIds.length === 0
          ? "Henüz hiçbir eczane sizi sevkiyatçı olarak eklemedi."
          : `${pharmacyIds.length} eczanenin sevkiyatçısısınız.`}
        {!courier.phone && (
          <Link href="/courier/profile" className="ml-2 font-semibold text-amber-600 dark:text-amber-400 hover:underline">
            Telefon numaranızı ekleyin →
          </Link>
        )}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map(({ key, label, Icon }) => (
          <Link
            key={key}
            href={key === "rota" ? "/courier/dashboard" : `/courier/dashboard?tab=${key}`}
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

      {tab === "rota" && (
        <>
          <p className="mt-4 flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            Rota dışı uğrama yapılmamaktadır. Rotadaki her eczanede paketleri teslim alıp/teslim ettikten
            sonra ilgili butona basın.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className={`${card} p-4`}>
              <p className="text-xs font-semibold text-slate-500">Bugün Uğranması Gereken Eczane</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{allStops.length}</p>
            </div>
            <div className={`${card} border-emerald-500/40 p-4`}>
              <p className="text-xs font-semibold text-slate-500">Toplam Uğranan Eczane</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{visitedCount}</p>
              <p className="text-[11px] text-slate-500">
                %{allStops.length ? Math.round((visitedCount / allStops.length) * 100) : 0} rota tamamlandı
              </p>
            </div>
            <div className={`${card} border-red-500/40 p-4`}>
              <p className="text-xs font-semibold text-slate-500">Uğranacak Eczaneler</p>
              <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{pendingCount}</p>
              <p className="text-[11px] text-slate-500">Bekleyen duraklar</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500">Durum:</span>
            {[
              { key: "tumu", label: "Tümü" },
              { key: "ugranan", label: "Uğranan" },
              { key: "ugranmayan", label: "Uğranmayan" },
            ].map((f) => (
              <Link
                key={f.key}
                href={f.key === "tumu" ? "/courier/dashboard" : `/courier/dashboard?durum=${f.key}`}
                className={`rounded-md px-2.5 py-1 font-semibold ${
                  durum === f.key ? "bg-orange-500 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {routeStops.length === 0 && (
              <p className={`${card} px-4 py-10 text-center text-sm text-slate-500`}>Bugün için rota yok.</p>
            )}
            {routeStops.map((stop, i) => {
              const pending = isPending(stop);
              return (
                <div
                  key={stop.pharmacy.id}
                  className={`${card} p-4 ${pending ? "" : "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-500/5"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          pending ? "bg-orange-500 text-white" : "bg-emerald-600 text-white"
                        }`}
                      >
                        {pending ? i + 1 : <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {stop.pharmacy.pharmacyName ?? stop.pharmacy.contactName}
                        </p>
                        <PharmacyLine p={stop.pharmacy} />
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      {stop.visitedAt && (
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                          ✓ Uğrandı · {formatTr(stop.visitedAt, true).split(" ").pop()}
                        </p>
                      )}
                      {stop.pickups.length > 0 && (
                        <p className="font-semibold text-orange-600 dark:text-orange-400">
                          {groupByPackage(stop.pickups).length} paket alınacak
                        </p>
                      )}
                      {stop.deliveries.length > 0 && (
                        <p className="font-semibold text-blue-600 dark:text-blue-400">
                          {groupByPackage(stop.deliveries).length} paket teslim edilecek
                        </p>
                      )}
                    </div>
                  </div>

                  {pending && (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {stop.pickups.length > 0 && (
                        <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
                          <p className="flex items-center gap-1 text-xs font-semibold text-orange-700 dark:text-orange-400">
                            <PackageCheck className="h-3.5 w-3.5" strokeWidth={2} />
                            Toplanacaklar
                          </p>
                          {groupByPackage(stop.pickups).map(({ key, items }) => (
                            <div key={key} className="mt-1.5 text-xs text-slate-700 dark:text-slate-300">
                              {items.map((s) => (
                                <p key={s.id} className="font-medium">
                                  {s.offer.quantity} X {s.offer.listing.medicineName}
                                </p>
                              ))}
                              <p className="text-slate-500">
                                Koli 1/1 · Alıcı: {items[0].offer.user.pharmacyName ?? items[0].offer.user.contactName} ·{" "}
                                <span className="font-mono">{items[0].packageCode ?? items[0].code}</span>
                              </p>
                            </div>
                          ))}
                          <form action={courierPickUpAction.bind(null, stop.pickups.map((s) => s.id))} className="mt-2">
                            <button className="flex items-center gap-1 rounded-md bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-400">
                              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                              Paketleri Teslim Aldım
                            </button>
                          </form>
                        </div>
                      )}
                      {stop.deliveries.length > 0 && (
                        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
                          <p className="flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
                            <PackageOpen className="h-3.5 w-3.5" strokeWidth={2} />
                            Teslim Edilecekler
                          </p>
                          {groupByPackage(stop.deliveries).map(({ key, items }) => (
                            <div key={key} className="mt-1.5 text-xs text-slate-700 dark:text-slate-300">
                              {items.map((s) => (
                                <p key={s.id} className="font-medium">
                                  {s.offer.quantity} X {s.offer.listing.medicineName}
                                </p>
                              ))}
                              <p className="text-slate-500">
                                Koli 1/1 · Gönderen:{" "}
                                {items[0].offer.listing.user.pharmacyName ?? items[0].offer.listing.user.contactName} ·{" "}
                                <span className="font-mono">{items[0].packageCode ?? items[0].code}</span>
                              </p>
                            </div>
                          ))}
                          <form action={courierDeliverAction.bind(null, stop.deliveries.map((s) => s.id))} className="mt-2">
                            <button className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500">
                              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                              Paketleri Teslim Ettim
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "aktif" && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className={card}>
            <h2 className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <PackageCheck className="h-4 w-4 text-orange-500" strokeWidth={1.75} />
              Teslim Alınacaklar ({groupByPackage(toPickUp).length} koli)
            </h2>
            <ul className="flex flex-col gap-2 p-3">
              {groupByPackage(toPickUp).map(({ key, items }) => (
                <li key={key} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {items.map((s) => (
                        <p key={s.id} className="font-semibold text-slate-900 dark:text-slate-100">
                          {s.offer.quantity} X {s.offer.listing.medicineName}
                        </p>
                      ))}
                      <p className="text-slate-500">
                        Gönderen: {items[0].offer.listing.user.pharmacyName} → Alıcı: {items[0].offer.user.pharmacyName}
                      </p>
                      <p className="font-mono text-slate-400">{items[0].packageCode ?? items[0].code}</p>
                    </div>
                    <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Transfere Hazır
                    </span>
                  </div>
                  <form action={courierPickUpAction.bind(null, items.map((s) => s.id))} className="mt-2">
                    <button className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 font-medium text-white hover:bg-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Aldım
                    </button>
                  </form>
                </li>
              ))}
              {toPickUp.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Bekleyen sevkiyat yok.</p>}
            </ul>
          </section>
          <section className={card}>
            <h2 className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Truck className="h-4 w-4 text-blue-600" strokeWidth={1.75} />
              Elimde Olanlar ({groupByPackage(inHand).length} koli)
            </h2>
            <ul className="flex flex-col gap-2 p-3">
              {groupByPackage(inHand).map(({ key, items }) => (
                <li key={key} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-xs">
                  {items.map((s) => (
                    <p key={s.id} className="font-semibold text-slate-900 dark:text-slate-100">
                      {s.offer.quantity} X {s.offer.listing.medicineName}
                    </p>
                  ))}
                  <p className="text-slate-500">Teslim edilecek: {items[0].offer.user.pharmacyName}</p>
                  <PharmacyLine p={items[0].offer.user} />
                  <form action={courierDeliverAction.bind(null, items.map((s) => s.id))} className="mt-2">
                    <button className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 font-medium text-white hover:bg-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Teslim Ettim
                    </button>
                  </form>
                </li>
              ))}
              {inHand.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Şu an elinizde teslim edilecek sevkiyat yok.</p>}
            </ul>
          </section>
        </div>
      )}

      {tab === "gecmis" && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
          <section className={card}>
            <h2 className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Son 14 Gün
            </h2>
            <ul>
              {days.map(([key, row]) => (
                <li key={key}>
                  <Link
                    href={`/courier/dashboard?tab=gecmis&gun=${key}`}
                    className={`flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-2.5 text-sm ${
                      selectedDay === key ? "bg-orange-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <span className="font-medium text-slate-900 dark:text-slate-100">{key.split("-").reverse().join(".")}</span>
                    <span className="text-xs text-slate-500">
                      {row.stops.size} durak · {row.pickups} alım · {row.deliveries} teslim
                    </span>
                  </Link>
                </li>
              ))}
              {days.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">Geçmiş rota yok.</li>}
            </ul>
          </section>
          <section className={card}>
            <h2 className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {selectedDay ? `${selectedDay.split("-").reverse().join(".")} Rotası` : "Detay için bir gün seçin"}
            </h2>
            {selectedDay && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/60 uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Ürün</th>
                    <th className="px-3 py-2">Gönderen → Alıcı</th>
                    <th className="px-3 py-2">Teslim Alma</th>
                    <th className="px-3 py-2">Teslim Etme</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDayEvents.map((s) => (
                    <tr key={s.id} className="border-t border-slate-200 dark:border-slate-800/60">
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                        {s.offer.quantity} X {s.offer.listing.medicineName}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                        {s.offer.listing.user.pharmacyName} → {s.offer.user.pharmacyName}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">{formatTr(s.pickedUpAt, true)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">{formatTr(s.deliveredAt, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}

      {tab === "ara" && (
        <section className={`${card} mt-6 p-4`}>
          <form className="flex flex-wrap gap-2">
            <input type="hidden" name="tab" value="ara" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Ürün adı, barkod, sevkiyat/koli kodu veya eczane..."
              className="w-full max-w-md rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            <button className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400">Ara</button>
          </form>
          {q && (
            <table className="mt-4 w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/60 uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Ürün</th>
                  <th className="px-3 py-2">Gönderen → Alıcı</th>
                  <th className="px-3 py-2">Kod</th>
                  <th className="px-3 py-2">Durum</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((s) => {
                  const stage = shipmentStage(s);
                  return (
                    <tr key={s.id} className="border-t border-slate-200 dark:border-slate-800/60">
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                        {s.offer.quantity} X {s.offer.listing.medicineName}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                        {s.offer.listing.user.pharmacyName} → {s.offer.user.pharmacyName}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-500">{s.packageCode ?? s.code}</td>
                      <td className="px-3 py-2">
                        <span className={`whitespace-nowrap rounded px-1.5 py-0.5 font-semibold ${stage.className}`}>{stage.label}</span>
                      </td>
                    </tr>
                  );
                })}
                {searchResults.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                      Eşleşen sevkiyat bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
