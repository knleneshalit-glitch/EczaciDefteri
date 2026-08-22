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
  Unlock,
  Clock,
  XCircle,
  Pencil,
  Truck,
  Tag,
  QrCode,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { requireApprovedMember } from "@/lib/group-access";
import {
  createOfferAction,
  updateOfferAction,
  respondOfferAction,
  closeListingAction,
  reopenListingAction,
} from "@/app/actions/listings";
import { effectiveUnitPrice } from "@/lib/pricing";
import { statusBadgeClass } from "@/lib/status-styles";
import BackButton from "@/components/BackButton";

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
  const myPendingOffer = listing.offers.find((o) => o.userId === user.id && o.status === "PENDING");
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
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="mb-4">
        <BackButton />
      </div>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
            <Sparkles className="h-5 w-5 shrink-0 text-violet-500" strokeWidth={1.75} />
            {listing.title}
          </h1>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {isOwner && (
              <Link
                href={`/groups/${id}/listings/${listingId}/edit`}
                className="flex items-center gap-1 rounded-full border border-blue-300 dark:border-blue-800 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                Düzenle
              </Link>
            )}
            {isOwner && listing.status === "OPEN" && (
              <form action={closeListingAction.bind(null, id, listingId)}>
                <button className="flex items-center gap-1 rounded-full border border-red-300 dark:border-red-800 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10">
                  <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
                  İlanı Kapat
                </button>
              </form>
            )}
            {isOwner && listing.status === "CLOSED" && (
              <form action={reopenListingAction.bind(null, id, listingId)}>
                <button className="flex items-center gap-1 rounded-full border border-emerald-300 dark:border-emerald-800 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
                  <Unlock className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Yeniden Yayınla
                </button>
              </form>
            )}
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(listing.status)}`}>
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
        <section className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <PackageCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {hasBonus ? "Mal Fazlalı Depo Şartı" : "Depo Fiyatı"}
            </p>
            {hasBonus && (
              <span className="rounded-full border-2 border-orange-400 bg-orange-100 dark:bg-orange-500/20 px-3 py-0.5 text-xs font-bold text-orange-700 dark:text-orange-400">
                {listing.totalStock! - listing.dealBonusQuantity!}+{listing.dealBonusQuantity} MF
              </span>
            )}
            {listing.ekstraIskontoYuzde != null && listing.ekstraIskontoYuzde > 0 && (
              <span className="rounded-full bg-blue-100 dark:bg-blue-500/20 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-400">
                %{listing.ekstraIskontoYuzde} Yüzde İskonto
              </span>
            )}
            {listing.ekstraIndirim != null && listing.ekstraIndirim > 0 && (
              <span className="rounded-full bg-purple-100 dark:bg-purple-500/20 px-2.5 py-0.5 text-[11px] font-medium text-purple-700 dark:text-purple-400">
                {listing.ekstraIndirim.toFixed(0)} ₺ Nakit İndirim
              </span>
            )}
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

      {!isOwner && !myPendingOffer && listing.status === "OPEN" && (
        <form
          action={createOfferAction.bind(null, id, listing.id)}
          className="mt-6 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-500/5 p-4"
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

      {!isOwner && myPendingOffer && listing.status === "OPEN" && (
        <form
          action={updateOfferAction.bind(null, id, listing.id, myPendingOffer.id)}
          className="mt-6 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-500/5 p-4"
        >
          <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
            Bu ilana verdiğiniz teklif henüz onaylanmadı — düzenleyebilirsiniz.
          </p>
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
                defaultValue={myPendingOffer.quantity}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Not (opsiyonel)
              </label>
              <input
                name="message"
                defaultValue={myPendingOffer.message ?? ""}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          <button className="mt-3 flex items-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500">
            <Pencil className="h-4 w-4" strokeWidth={1.75} />
            Teklifi Güncelle
          </button>
        </form>
      )}

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <MessagesSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.75} />
          Teklifler ({listing.offers.length})
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {listing.offers.map((offer) => {
            const OfferStatusIcon = OFFER_STATUS_ICON[offer.status];
            return (
              <li key={offer.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
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
                    {offer.shipment?.barcodesUploadedAt ? (
                      <>
                        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(offer.shipment.status)}`}>
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
                      <Link
                        href={`/groups/${id}/listings/${listingId}/offers/${offer.id}/prepare`}
                        className="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                      >
                        <QrCode className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Sevkiyatı Hazırla
                      </Link>
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
