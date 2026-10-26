import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ArrowLeft, Phone, CheckCircle2, Circle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePharmacy } from "@/lib/require-user";
import { formatTr } from "@/lib/dates";
import { shipmentStage } from "@/lib/shipment-stage";
import { telHref } from "@/lib/phone";

export default async function TrackShipmentPage(props: PageProps<"/shipments/track/[code]">) {
  const pharmacy = await requirePharmacy();
  const { code } = await props.params;
  const decoded = decodeURIComponent(code);

  const shipments = await prisma.shipment.findMany({
    where: {
      OR: [{ code: decoded }, { packageCode: decoded }],
      AND: [{ OR: [{ offer: { userId: pharmacy.id } }, { offer: { listing: { userId: pharmacy.id } } }] }],
    },
    include: {
      offer: { include: { listing: { include: { user: true } }, user: true } },
      courier: { select: { contactName: true, phone: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  if (shipments.length === 0) notFound();

  const first = shipments[0];
  const seller = first.offer.listing.user;
  const buyer = first.offer.user;
  const stage = shipmentStage(first);

  const steps = [
    { label: "Teklif kabul edildi", at: first.offer.acceptedAt ?? first.createdAt, done: true },
    { label: "Sevkiyat çağrıldı (etiket yazdırıldı)", at: first.printedAt, done: !!first.printedAt },
    {
      label: `Sürücü göndericiden teslim aldı${first.courier ? ` — ${first.courier.contactName}` : ""}`,
      at: first.pickedUpAt,
      done: !!first.pickedUpAt,
    },
    {
      label: first.buyerConfirmedAt ? "Eczacı teslim aldığını onayladı" : "Dağıtıcı alıcı eczaneye teslim etti",
      at: first.deliveredAt,
      done: first.status === "TESLIM_EDILDI",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <Link href="/shipments" className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:underline">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Sevkiyat Takibi
      </Link>
      <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
        Sevkiyat Takibi
      </h1>
      <p className="mt-1 font-mono text-sm text-slate-500">{decoded}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Gönderen</p>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{seller.pharmacyName ?? seller.contactName}</p>
          <p className="text-slate-500">
            {seller.region}
            {seller.district ? ` / ${seller.district}` : ""}
          </p>
          <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">Alıcı</p>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{buyer.pharmacyName ?? buyer.contactName}</p>
          <p className="text-slate-500">{buyer.address ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Koli İçeriği</p>
          {shipments.map((s) => (
            <p key={s.id} className="font-semibold text-slate-900 dark:text-slate-100">
              {s.offer.quantity} X {s.offer.listing.medicineName}
            </p>
          ))}
          <p className="mt-2">
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${stage.className}`}>{stage.label}</span>
          </p>
          {first.courier && (
            <p className="mt-2 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Phone className="h-3.5 w-3.5" strokeWidth={2} />
              Sevkiyatçı: {first.courier.contactName}
              {first.courier.phone && (
                <a href={telHref(first.courier.phone)} className="font-semibold text-emerald-600 dark:text-emerald-400 underline">
                  {first.courier.phone}
                </a>
              )}
            </p>
          )}
        </div>
      </div>

      <ol className="mt-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        {steps.map((step, i) => (
          <li key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && (
              <span
                className={`absolute left-[9px] top-5 h-full w-0.5 ${steps[i + 1].done ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`}
              />
            )}
            {step.done ? (
              <CheckCircle2 className="relative h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
            ) : (
              <Circle className="relative h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" strokeWidth={2} />
            )}
            <div>
              <p className={`text-sm font-medium ${step.done ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}`}>{step.label}</p>
              <p className="text-xs text-slate-500">{step.done ? formatTr(step.at, true) : "Bekleniyor"}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
