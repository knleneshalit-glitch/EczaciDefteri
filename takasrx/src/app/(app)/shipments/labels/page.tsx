import Link from "next/link";
import { notFound } from "next/navigation";
import { Tag, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePharmacy } from "@/lib/require-user";
import { generateQrDataUrl } from "@/lib/qrcode";
import BulkPrintButton from "./BulkPrintButton";

export default async function BulkLabelsPage(props: PageProps<"/shipments/labels">) {
  const pharmacy = await requirePharmacy();
  const { ids } = await props.searchParams;
  const shipmentIds = (typeof ids === "string" ? ids.split(",") : []).filter(Boolean).slice(0, 500);
  if (shipmentIds.length === 0) notFound();

  const shipments = await prisma.shipment.findMany({
    where: { id: { in: shipmentIds }, offer: { listing: { userId: pharmacy.id } } },
    include: { offer: { include: { listing: true, user: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (shipments.length === 0) notFound();

  const labels = await Promise.all(
    shipments.map(async (s) => ({ shipment: s, qr: await generateQrDataUrl(s.code) }))
  );
  const printedCount = shipments.filter((s) => s.printedAt).length;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 print:m-0 print:max-w-none print:p-0">
      <style>{`@media print { @page { size: 60mm 40mm; margin: 0; } html, body { background: #fff !important; } }`}</style>

      <div className="print:hidden">
        <Link
          href="/offers/received"
          className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Gönderimlerime dön
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
              <Tag className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
              60x40 Sevkiyat Etiketleri ({labels.length})
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Etiket yazıcınızda kağıt boyutunu 60 x 40 mm seçin. Yazdırdığınızda gönderimler
              transfere hazır olarak sevkiyatçınızın ekranına düşer.
              {printedCount > 0 && ` (${printedCount} etiket daha önce yazdırılmış.)`}
            </p>
          </div>
          <BulkPrintButton shipmentIds={shipments.map((s) => s.id)} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-4 print:mt-0 print:block">
        {labels.map(({ shipment: s, qr }) => (
          <div
            key={s.id}
            className="flex h-[40mm] w-[60mm] flex-col overflow-hidden rounded-md border border-slate-900 bg-white p-[2mm] text-black print:break-after-page print:rounded-none print:border-0"
          >
            <div className="flex gap-[2mm]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="Sevkiyat karekodu" className="h-[19mm] w-[19mm] shrink-0" />
              <div className="min-w-0 text-[7pt] leading-tight">
                <p className="font-mono text-[6.5pt] font-bold">{s.code}</p>
                <p className="mt-[1mm] truncate">
                  <span className="font-semibold">Gönderen:</span> {pharmacy.pharmacyName ?? pharmacy.contactName}
                </p>
                <p className="truncate">
                  <span className="font-semibold">Alıcı:</span> {s.offer.user.pharmacyName ?? s.offer.user.contactName}
                </p>
                <p className="truncate text-[6.5pt]">
                  {s.offer.user.region}
                  {s.offer.user.district ? ` / ${s.offer.user.district}` : ""}
                </p>
              </div>
            </div>
            <p className="mt-[1.5mm] line-clamp-2 text-[8pt] font-bold leading-tight">{s.offer.listing.medicineName}</p>
            <p className="mt-auto flex justify-between text-[7pt]">
              <span>Adet: {s.offer.quantity}</span>
              <span>{s.createdAt.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
