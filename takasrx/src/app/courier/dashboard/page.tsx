import { Truck, Package, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCourier } from "@/lib/require-user";
import { markPickedUpAction, markDeliveredAction } from "@/app/actions/shipments";

export default async function CourierDashboardPage() {
  const courier = await requireCourier();

  const assignments = await prisma.courierAssignment.findMany({
    where: { courierId: courier.id },
    select: { pharmacyId: true },
  });
  const pharmacyIds = assignments.map((a) => a.pharmacyId);

  const [pending, mine] = await Promise.all([
    prisma.shipment.findMany({
      where: {
        status: "HAZIRLANIYOR",
        offer: { listing: { userId: { in: pharmacyIds } } },
      },
      include: {
        offer: { include: { listing: { include: { user: true } }, user: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.shipment.findMany({
      where: { courierId: courier.id, status: "TESLIM_ALINDI" },
      include: {
        offer: { include: { listing: { include: { user: true } }, user: true } },
      },
      orderBy: { pickedUpAt: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <Truck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Sevkiyatlarım
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Atandığınız eczanelerden gelen bekleyen sevkiyatlar.
      </p>

      {pharmacyIds.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">
          Henüz hiçbir eczane sizi sevkiyatçı olarak eklemedi.
        </p>
      )}

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Package className="h-4 w-4 text-slate-600 dark:text-slate-400" strokeWidth={1.75} />
          Teslim Alınacaklar ({pending.length})
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {pending.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {s.offer.listing.medicineName} · {s.offer.quantity} adet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Gönderen: {s.offer.listing.user.pharmacyName} (
                {s.offer.listing.user.region}
                {s.offer.listing.user.district ? ` / ${s.offer.listing.user.district}` : ""})
              </p>
              <p className="text-xs text-slate-500">
                Alıcı: {s.offer.user.pharmacyName} ({s.offer.user.region}
                {s.offer.user.district ? ` / ${s.offer.user.district}` : ""})
              </p>
              <p className="mt-1 font-mono text-xs text-slate-400">{s.code}</p>
              <form action={markPickedUpAction.bind(null, s.id)} className="mt-2">
                <button className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500">
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Aldım
                </button>
              </form>
            </li>
          ))}
          {pending.length === 0 && (
            <p className="text-sm text-slate-500">Bekleyen sevkiyat yok.</p>
          )}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Truck className="h-4 w-4 text-slate-600 dark:text-slate-400" strokeWidth={1.75} />
          Elimde Olanlar ({mine.length})
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {mine.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {s.offer.listing.medicineName} · {s.offer.quantity} adet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Teslim edilecek: {s.offer.user.pharmacyName} ({s.offer.user.region}
                {s.offer.user.district ? ` / ${s.offer.user.district}` : ""})
              </p>
              <p className="text-xs text-slate-500">
                {s.offer.user.address ?? "Adres girilmemiş"}
              </p>
              <form action={markDeliveredAction.bind(null, s.id)} className="mt-2">
                <button className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500">
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Teslim Ettim
                </button>
              </form>
            </li>
          ))}
          {mine.length === 0 && (
            <p className="text-sm text-slate-500">Şu an elinizde teslim edilecek sevkiyat yok.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
