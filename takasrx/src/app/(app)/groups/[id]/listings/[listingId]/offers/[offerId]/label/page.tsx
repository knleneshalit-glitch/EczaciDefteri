import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { generateQrDataUrl } from "@/lib/qrcode";
import PrintButton from "./PrintButton";

export default async function ShipmentLabelPage(
  props: PageProps<"/groups/[id]/listings/[listingId]/offers/[offerId]/label">
) {
  const user = await requireUser();
  const { listingId, offerId } = await props.params;

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

  const qrDataUrl = await generateQrDataUrl(offer.shipment.code);

  return (
    <div className="mx-auto w-full max-w-md px-6 py-10 print:py-0">
      <div className="flex justify-end print:hidden">
        <PrintButton />
      </div>

      <div className="mt-4 rounded-lg border-2 border-slate-900 bg-white p-6 text-slate-900 print:mt-0 print:border-black">
        <div className="flex items-center justify-between border-b-2 border-dashed border-slate-300 pb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Sevkiyat Kodu</p>
            <p className="font-mono text-sm font-bold">{offer.shipment.code}</p>
          </div>
          <img src={qrDataUrl} alt="Sevkiyat karekodu" width={110} height={110} />
        </div>

        <div className="mt-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Gönderen Eczane</p>
          <p className="font-semibold">{offer.listing.user.pharmacyName}</p>
          <p className="text-sm text-slate-600">{offer.listing.user.address ?? "—"}</p>
          <p className="text-sm text-slate-600">
            {offer.listing.user.region}
            {offer.listing.user.district ? ` / ${offer.listing.user.district}` : ""}
          </p>
        </div>

        <div className="mt-4 border-t-2 border-dashed border-slate-300 pt-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Alıcı Eczane</p>
          <p className="font-semibold">{offer.user.pharmacyName}</p>
          <p className="text-sm text-slate-600">{offer.user.address ?? "—"}</p>
          <p className="text-sm text-slate-600">
            {offer.user.region}
            {offer.user.district ? ` / ${offer.user.district}` : ""}
          </p>
        </div>

        <div className="mt-4 border-t-2 border-dashed border-slate-300 pt-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Teslim Alınan Ürün</p>
          <p className="font-semibold">{offer.listing.medicineName}</p>
          <p className="text-sm text-slate-600">Adet: {offer.quantity}</p>
        </div>
      </div>
    </div>
  );
}
