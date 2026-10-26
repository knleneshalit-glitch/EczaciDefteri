import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, ArrowLeft, QrCode } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { generateQrDataUrl } from "@/lib/qrcode";
import ShipmentLabel from "@/components/ShipmentLabel";
import PrintButton from "./PrintButton";

export default async function ShipmentLabelPage(
  props: PageProps<"/groups/[id]/listings/[listingId]/offers/[offerId]/label">
) {
  const user = await requireUser();
  const { id, listingId, offerId } = await props.params;

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: {
      listing: { include: { user: true } },
      user: true,
      shipment: true,
    },
  });

  if (!offer || offer.listingId !== listingId || !offer.shipment) notFound();
  const isOwner = offer.listing.userId === user.id;
  const isBuyer = offer.userId === user.id;
  if (!isOwner && !isBuyer) notFound();

  const shipment = offer.shipment;
  // Aynı koliye konmuş diğer ürünler de etikette görünür.
  const packageItems = shipment.packageCode
    ? await prisma.shipment.findMany({
        where: { packageCode: shipment.packageCode, offer: { listing: { userId: offer.listing.userId } } },
        include: { offer: { include: { listing: true } } },
        orderBy: { createdAt: "asc" },
      })
    : null;
  const code = shipment.packageCode ?? shipment.code;
  const qrDataUrl = await generateQrDataUrl(code);
  const barcodes = shipment.barcodes?.split("\n").filter(Boolean) ?? [];
  const items = packageItems
    ? packageItems.map((s) => ({ quantity: s.offer.quantity, name: s.offer.listing.medicineName }))
    : [{ quantity: offer.quantity, name: offer.listing.medicineName }];

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6 sm:px-6 sm:py-10 print:m-0 print:max-w-none print:p-0">
      <style>{`@media print { @page { size: 60mm 40mm; margin: 0; } html, body { background: #fff !important; } }`}</style>

      <div className="print:hidden">
        <Link
          href={`/groups/${id}/listings/${listingId}`}
          className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          İlana dön
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {shipment.printedAt ? (
            <span className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
              Transfere hazır — sevkiyatçının ekranına düştü
            </span>
          ) : (
            <span className="text-sm text-slate-600 dark:text-slate-400">60 x 40 mm sevkiyat etiketi</span>
          )}
          {isOwner && <PrintButton shipmentId={shipment.id} />}
        </div>
        <p className="mt-2 text-xs text-slate-500">Etiket yazıcınızda kağıt boyutunu 60 x 40 mm seçin.</p>
      </div>

      <div className="mt-4 print:mt-0">
        <ShipmentLabel
          code={code}
          qrDataUrl={qrDataUrl}
          senderName={offer.listing.user.pharmacyName ?? offer.listing.user.contactName}
          receiver={{
            name: offer.user.pharmacyName ?? offer.user.contactName,
            region: offer.user.region,
            district: offer.user.district,
          }}
          items={items}
          date={shipment.createdAt}
        />
      </div>

      {barcodes.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 print:hidden">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <QrCode className="h-3.5 w-3.5" strokeWidth={1.75} />
            Yüklenen Karekodlar ({barcodes.length})
          </p>
          <ul className="mt-2 font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
            {barcodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
