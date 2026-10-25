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
          const isPackage = items.length > 1 || !!items[0].packageCode;
          return (
            <div
              key={key}
              className="flex h-[40mm] w-[60mm] flex-col overflow-hidden rounded-md border border-slate-900 bg-white p-[2mm] text-black print:break-after-page print:rounded-none print:border-0"
            >
              <div className="flex gap-[2mm]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="Sevkiyat karekodu" className="h-[17mm] w-[17mm] shrink-0" />
                <div className="min-w-0 text-[7pt] leading-tight">
                  <p className="font-mono text-[6.5pt] font-bold">{code}</p>
                  <p className="mt-[0.5mm] truncate">
                    <span className="font-semibold">Gönderen:</span> {pharmacy.pharmacyName ?? pharmacy.contactName}
                  </p>
                  <p className="truncate">
                    <span className="font-semibold">Alıcı:</span> {buyer.pharmacyName ?? buyer.contactName}
                  </p>
                  <p className="truncate text-[6.5pt]">
                    {buyer.region}
                    {buyer.district ? ` / ${buyer.district}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-[1mm] text-[7pt] font-bold leading-tight">
                {items.slice(0, isPackage ? 3 : 1).map((s) => (
                  <p key={s.id} className="truncate">
                    {s.offer.quantity} X {s.offer.listing.medicineName}
                  </p>
                ))}
                {items.length > 3 && <p className="font-normal">+{items.length - 3} ürün daha</p>}
              </div>
              <p className="mt-auto flex justify-between text-[6.5pt]">
                <span>
                  Koli: 1/1 · {items.length} ürün · {items.reduce((sum, s) => sum + s.offer.quantity, 0)} adet
                </span>
                <span>{items[0].createdAt.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
