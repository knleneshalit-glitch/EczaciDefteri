import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  PackageCheck,
  MessagesSquare,
  Send,
  Check,
  X,
  CircleDot,
  CheckCircle2,
  Lock,
  Clock,
  XCircle,
  Pencil,
  Truck,
  Tag,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { requireApprovedMember } from "@/lib/group-access";
import { createOfferAction, respondOfferAction, closeListingAction } from "@/app/actions/listings";
import { prepareShipmentAction } from "@/app/actions/shipments";
import { effectiveUnitPrice } from "@/lib/pricing";
import { statusBadgeClass } from "@/lib/status-styles";

const SHIPMENT_STATUS_LABEL: Record<string, string> = {
  HAZIRLANIYOR: "Sevkiyata Hazırlanıyor",
  TESLIM_ALINDI: "Sevkiyatçı Teslim Aldı",
  TESLIM_EDILDI: "Teslim Edildi",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Açık",
  MATCHED: "Eşleşti",
  CLOSED: "Kapandı",
};

const STATUS_ICON: Record<string, LucideIcon> = {
  OPEN: CircleDot,
  MATCHED: CheckCircle2,
  CLOSED: Lock,
};

const OFFER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Bekliyor",
  ACCEPTED: "Kabul Edildi",
  REJECTED: "Reddedildi",
};

const OFFER_STATUS_ICON: Record<string, LucideIcon> = {
  PENDING: Clock,
  ACCEPTED: CheckCircle2,
  REJECTED: XCircle,
};

export default async function ListingDetailPage(
  props: PageProps<"/groups/[id]/listings/[listingId]">
) {
  const user = await requireUser();
  const { id, listingId } = await props.params;
  await requireApprovedMember(id, user);

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      user: true,
      offers: { include: { user: true, shipment: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!listing || listing.groupId !== id) notFound();

  const isOwner = listing.userId === user.id;
  const alreadyOffered = listing.offers.some((o) => o.userId === user.id);
  const StatusIcon = STATUS_ICON[listing.status];

  const acceptedQty = listing.offers
    .filter((o) => o.status === "ACCEPTED")
    .reduce((sum, o) => sum + o.quantity, 0);
  const remaining = listing.totalStock != null ? listing.totalStock - acceptedQty : null;
  const netFiyat = effectiveUnitPrice(listing);
  const hasBonus =
    listing.dealBonusQuantity != null &&
    listing.totalStock != null &&
    listing.dealBonusQuantity > 0 &&
    listing.dealBonusQuantity < listing.totalStock;

  const maxQty =
    remaining != null && listing.maxAlim != null
      ? Math.min(remaining, listing.maxAlim)
      : (remaining ?? listing.maxAlim ?? undefined);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{listing.title}</h1>
          <div className="flex items-center gap-2">
            {isOwner && listing.status === "OPEN" && (
              <>
                <Link
                  href={`/groups/${id}/listings/${listingId}/edit`}
                  className="flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Düzenle
                </Link>
                <form action={closeListingAction.bind(null, id, listingId)}>
                  <button className="flex items-center gap-1 rounded-md border border-red-500/40 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10">
                    <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
                    İlanı Kapat
                  </button>
                </form>
              </>
            )}
            <span className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(listing.status)}`}>
              <StatusIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {STATUS_LABEL[listing.status]}
            </span>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          <span className="font-medium">İlaç:</span> {listing.medicineName}
          {listing.barkod ? ` · ${listing.barkod}` : ""}
        </p>
        {listing.quantity && (
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-medium">Miktar:</span> {listing.quantity}
          </p>
        )}
        {(listing.minAlim || listing.maxAlim) && (
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-medium">Kişi Başı:</span>{" "}
            {listing.minAlim ? `min ${listing.minAlim}` : ""}
            {listing.maxAlim ? ` · maks ${listing.maxAlim}` : ""}
          </p>
        )}
        {listing.expiryDate && (
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-medium">SKT:</span>{" "}
            {listing.expiryDate.toLocaleDateString("tr-TR")}
          </p>
        )}
        {listing.description && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{listing.description}</p>
        )}
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
          İlan sahibi: {listing.user.pharmacyName}
        </p>
      </div>

      {netFiyat != null && (
        <section className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {hasBonus ? "Mal Fazlalı Depo Şartı" : "Depo Fiyatı"}
            </p>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Efektif Birim Fiyat</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{netFiyat.toFixed(2)} ₺</p>
            </div>
            {hasBonus && listing.birimFiyat != null && (
              <div>
                <p className="text-xs text-slate-500">Depo Liste Fiyatı</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-through">
                  {listing.birimFiyat.toFixed(2)} ₺
                </p>
              </div>
            )}
            {remaining != null && (
              <div>
                <p className="text-xs text-slate-500">Kalan Stok</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{remaining} adet</p>
              </div>
            )}
          </div>
          {hasBonus && (
            <p className="mt-3 text-xs text-slate-500">
              {listing.totalStock! - listing.dealBonusQuantity!} adet parayla alınıp{" "}
              {listing.dealBonusQuantity} adet mal fazlası kazanılmış (toplam {listing.totalStock}{" "}
              adet); grup üyeleri bu sayede indirimli birim fiyattan alım yapıyor.
            </p>
          )}
        </section>
      )}

      {!isOwner && !alreadyOffered && listing.status === "OPEN" && (
        <form
          action={createOfferAction.bind(null, id, listing.id)}
          className="mt-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Alım Miktarı
              </label>
              <input
                type="number"
                name="quantity"
                required
                min={listing.minAlim ?? 1}
                max={maxQty}
                defaultValue={listing.minAlim ?? 1}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Not (opsiyonel)
              </label>
              <input
                name="message"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          <button className="mt-3 flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            <Send className="h-4 w-4" strokeWidth={1.75} />
            Alım Teklifi Ver
          </button>
        </form>
      )}

      {alreadyOffered && !isOwner && (
        <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">Bu ilana zaten teklif verdiniz.</p>
      )}

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <MessagesSquare className="h-4 w-4 text-slate-600 dark:text-slate-400" strokeWidth={1.75} />
          Teklifler ({listing.offers.length})
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {listing.offers.map((offer) => {
            const OfferStatusIcon = OFFER_STATUS_ICON[offer.status];
            return (
              <li key={offer.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {offer.user.pharmacyName}
                  </span>
                  <span className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(offer.status)}`}>
                    <OfferStatusIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {OFFER_STATUS_LABEL[offer.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {offer.quantity} adet
                  {offer.unitPrice != null ? ` · ${offer.unitPrice.toFixed(2)} ₺/adet` : ""}
                  {offer.totalPrice != null ? ` · Toplam: ${offer.totalPrice.toFixed(2)} ₺` : ""}
                </p>
                {offer.message && (
                  <p className="mt-1 text-sm text-slate-500">{offer.message}</p>
                )}
                {isOwner && offer.status === "PENDING" && listing.status === "OPEN" && (
                  <div className="mt-2 flex gap-2">
                    <form action={respondOfferAction.bind(null, id, listing.id, offer.id, true)}>
                      <button className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500">
                        <Check className="h-3.5 w-3.5" strokeWidth={2} />
                        Kabul Et
                      </button>
                    </form>
                    <form action={respondOfferAction.bind(null, id, listing.id, offer.id, false)}>
                      <button className="flex items-center gap-1 rounded-md border border-red-500/40 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10">
                        <X className="h-3.5 w-3.5" strokeWidth={2} />
                        Reddet
                      </button>
                    </form>
                  </div>
                )}

                {offer.status === "ACCEPTED" && (
                  <div className="mt-2 flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 pt-2">
                    {offer.shipment ? (
                      <>
                        <span className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(offer.shipment.status)}`}>
                          <Truck className="h-3.5 w-3.5" strokeWidth={1.75} />
                          {SHIPMENT_STATUS_LABEL[offer.shipment.status]}
                        </span>
                        <Link
                          href={`/groups/${id}/listings/${listingId}/offers/${offer.id}/label`}
                          className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          <Tag className="h-3.5 w-3.5" strokeWidth={1.75} />
                          Etiketi Görüntüle
                        </Link>
                      </>
                    ) : isOwner ? (
                      <form action={prepareShipmentAction.bind(null, id, listingId, offer.id)}>
                        <button className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500">
                          <Truck className="h-3.5 w-3.5" strokeWidth={1.75} />
                          Sevkiyata Hazırla
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-slate-500">
                        İlan sahibi sevkiyatı hazırlıyor.
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
          {listing.offers.length === 0 && (
            <p className="text-sm text-slate-600 dark:text-slate-400">Henüz teklif yok.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
