import Link from "next/link";
import { notFound } from "next/navigation";
import { Tag, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePharmacy } from "@/lib/require-user";
import { generateQrDataUrl } from "@/lib/qrcode";
import ShipmentLabel from "@/components/ShipmentLabel";
import BulkPrintButton from "./BulkPrintButton";

export default async function BulkLabelsPage(props: PageProps<"/shipments/labels">) {
  const pharmacy = await requirePharmacy();
  const { ids } = await props.searchParams;
  const shipmentIds = (typeof ids === "string" ? ids.split(",") : []).filter(Boolean).slice(0, 500);
  if (shipmentIds.length === 0) notFound();

  const selected = await prisma.shipment.findMany({
    where: { id: { in: shipmentIds }, offer: { listing: { userId: pharmacy.id } } },
    select: { id: true, packageCode: true },
  });
  if (selected.length === 0) notFound();

  // Bir kolideki ürünlerden biri seçildiyse koli etiketi tüm içeriğiyle basılır.
  const packageCodes = Array.from(new Set(selected.map((s) => s.packageCode).filter((c): c is string => !!c)));
  const shipments = await prisma.shipment.findMany({
    where: {
      offer: { listing: { userId: pharmacy.id } },
      OR: [{ id: { in: selected.map((s) => s.id) } }, ...(packageCodes.length ? [{ packageCode: { in: packageCodes } }] : [])],
    },
    include: { offer: { include: { listing: true, user: true } } },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, typeof shipments>();
  for (const s of shipments) {
    const key = s.packageCode ?? s.id;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }

  const labels = await Promise.all(
    Array.from(groups.entries()).map(async ([key, items]) => {
      const code = items[0].packageCode ?? items[0].code;
      return { key, code, items, qr: await generateQrDataUrl(code) };
    })
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
              60x40 Sevkiyat Etiketleri ({labels.length} koli · {shipments.length} ürün)
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Etiket yazıcınızda kağıt boyutunu 60 x 40 mm seçin. Yazdırdığınızda gönderimler
              transfere hazır olarak sevkiyatçınızın ekranına düşer.
              {printedCount > 0 && ` (${printedCount} ürünün etiketi daha önce yazdırılmış.)`}
            </p>
          </div>
          <BulkPrintButton shipmentIds={shipments.map((s) => s.id)} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-4 print:mt-0 print:block">
        {labels.map(({ key, code, items, qr }) => {
          const buyer = items[0].offer.user;
          return (
            <ShipmentLabel
              key={key}
              code={code}
              qrDataUrl={qr}
              senderName={pharmacy.pharmacyName ?? pharmacy.contactName}
              receiver={{ name: buyer.pharmacyName ?? buyer.contactName, region: buyer.region, district: buyer.district }}
              items={items.map((s) => ({ quantity: s.offer.quantity, name: s.offer.listing.medicineName }))}
              date={items[0].createdAt}
            />
          );
        })}
      </div>
    </div>
  );
}
