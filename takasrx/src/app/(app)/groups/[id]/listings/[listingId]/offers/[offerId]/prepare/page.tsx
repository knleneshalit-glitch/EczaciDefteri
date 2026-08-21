import Link from "next/link";
import { notFound } from "next/navigation";
import { QrCode, Tag, ShieldCheck, Truck, SkipForward } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { generateQrDataUrl } from "@/lib/qrcode";
import BarcodeUploadForm from "@/components/BarcodeUploadForm";
import { skipBarcodeUploadAction } from "@/app/actions/shipments";

export default async function PrepareShipmentPage(
  props: PageProps<"/groups/[id]/listings/[listingId]/offers/[offerId]/prepare">
) {
  const user = await requireUser();
  const { id, listingId, offerId } = await props.params;

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: {
      listing: true,
      user: true,
      shipment: true,
    },
  });

  if (!offer || offer.listingId !== listingId || offer.listing.groupId !== id) notFound();
  if (offer.listing.userId !== user.id) notFound();
  if (offer.status !== "ACCEPTED") notFound();

  const qrDataUrl = offer.shipment ? await generateQrDataUrl(offer.shipment.code) : null;

  return (
    <div className="mx-auto w-full max-w-lg px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <QrCode className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Sevkiyat Hazırlama
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Teklifi kabul ettiniz. Şimdi sevkiyatı karekodla eşleştirip transfere hazırlayın.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <p className="font-semibold text-slate-900 dark:text-slate-100">{offer.listing.medicineName}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {offer.quantity} adet
          {offer.totalPrice != null ? ` · Toplam: ${offer.totalPrice.toFixed(2)} ₺` : ""}
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Alıcı: <span className="font-medium">{offer.user.pharmacyName}</span>
        </p>
      </div>

      {!offer.shipment?.barcodesUploadedAt ? (
        <>
          <BarcodeUploadForm groupId={id} listingId={listingId} offerId={offerId} />
          <form action={skipBarcodeUploadAction.bind(null, id, listingId, offerId)} className="mt-3 text-center">
            <button className="mx-auto flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-300">
              <SkipForward className="h-3.5 w-3.5" strokeWidth={1.75} />
              Karekod Yüklemeden Devam Et — Transfer Fişine Git
            </button>
          </form>
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
          <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Karekodlar yüklendi — transfer için hazır.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {offer.shipment.barcodes?.split("\n").filter(Boolean).length ?? 0} karekod kaydedildi.
          </p>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="Sevkiyat karekodu" width={140} height={140} className="mx-auto mt-4 rounded-lg bg-white p-2" />
          )}
          <p className="mt-2 font-mono text-xs text-slate-500">{offer.shipment.code}</p>

          {offer.shipment.printedAt ? (
            <p className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
              <Truck className="h-4 w-4" strokeWidth={1.75} />
              Etiket yazdırıldı, sevkiyatçının sayfasına düştü.
            </p>
          ) : (
            <p className="mt-4 text-xs text-slate-500">
              Etiketi yazdırdığınızda sevkiyatçının sayfasına otomatik düşer.
            </p>
          )}

          <Link
            href={`/groups/${id}/listings/${listingId}/offers/${offerId}/label`}
            className="mx-auto mt-4 flex w-fit items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            <Tag className="h-4 w-4" strokeWidth={1.75} />
            Transfer Fişi Yazdır
          </Link>
        </div>
      )}

      <Link
        href={`/groups/${id}/listings/${listingId}`}
        className="mt-6 inline-block text-sm text-slate-600 dark:text-slate-400 hover:underline"
      >
        ← İlana dön
      </Link>
    </div>
  );
}
