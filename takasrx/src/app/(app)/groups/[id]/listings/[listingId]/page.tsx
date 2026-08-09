import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { requireApprovedMember } from "@/lib/group-access";
import { createOfferAction, respondOfferAction } from "@/app/actions/listings";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Açık",
  MATCHED: "Eşleşti",
  CLOSED: "Kapandı",
};

const OFFER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Bekliyor",
  ACCEPTED: "Kabul Edildi",
  REJECTED: "Reddedildi",
};

export default async function ListingDetailPage(
  props: PageProps<"/groups/[id]/listings/[listingId]">
) {
  const user = await requireUser();
  const { id, listingId } = await props.params;
  await requireApprovedMember(id, user.id);

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      user: true,
      offers: { include: { user: true }, orderBy: { createdAt: "desc" } },
      tiers: { orderBy: { minQuantity: "asc" } },
    },
  });
  if (!listing || listing.groupId !== id) notFound();

  const isOwner = listing.userId === user.id;
  const alreadyOffered = listing.offers.some((o) => o.userId === user.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-100">{listing.title}</h1>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
            {STATUS_LABEL[listing.status]}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          <span className="font-medium">İlaç:</span> {listing.medicineName}
          {listing.barkod ? ` · ${listing.barkod}` : ""}
        </p>
        {listing.quantity && (
          <p className="text-sm text-slate-300">
            <span className="font-medium">Miktar:</span> {listing.quantity}
          </p>
        )}
        {listing.totalStock != null && (
          <p className="text-sm text-slate-300">
            <span className="font-medium">Toplam Stok:</span> {listing.totalStock} adet
          </p>
        )}
        {listing.birimFiyat != null && (
          <p className="text-sm text-slate-300">
            <span className="font-medium">Depo Fiyatı:</span>{" "}
            {listing.birimFiyat.toFixed(2)} ₺
            {listing.etiketFiyati != null && (
              <span className="text-slate-400"> (Etiket: {listing.etiketFiyati.toFixed(2)} ₺)</span>
            )}
          </p>
        )}
        {(listing.minAlim || listing.maxAlim || listing.alimKatlari) && (
          <p className="text-sm text-slate-300">
            <span className="font-medium">Alım Şartları:</span>{" "}
            {listing.minAlim ? `min ${listing.minAlim}` : ""}
            {listing.maxAlim ? ` · maks ${listing.maxAlim}` : ""}
            {listing.alimKatlari ? ` · ${listing.alimKatlari}'lü katlar` : ""}
          </p>
        )}
        {listing.expiryDate && (
          <p className="text-sm text-slate-300">
            <span className="font-medium">SKT:</span>{" "}
            {listing.expiryDate.toLocaleDateString("tr-TR")}
          </p>
        )}
        {listing.description && (
          <p className="mt-2 text-sm text-slate-400">{listing.description}</p>
        )}
        <p className="mt-3 text-xs text-slate-400">
          İlan sahibi: {listing.user.pharmacyName}
        </p>
      </div>

      {listing.tiers.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-slate-100">Teklif Şartları</h2>
          <div className="mt-2 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-800/40 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Alım Miktarı ≥</th>
                  <th className="px-3 py-2">Mal Fazlası</th>
                  <th className="px-3 py-2">İskonto %</th>
                  <th className="px-3 py-2">İskonto TL</th>
                </tr>
              </thead>
              <tbody>
                {listing.tiers.map((t) => (
                  <tr key={t.id} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-3 py-2">{t.minQuantity}</td>
                    <td className="px-3 py-2">{t.bonusQuantity}</td>
                    <td className="px-3 py-2">%{t.discountPercent}</td>
                    <td className="px-3 py-2">{t.discountAmount} ₺</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!isOwner && !alreadyOffered && listing.status === "OPEN" && (
        <form
          action={createOfferAction.bind(null, id, listing.id)}
          className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Alım Miktarı
              </label>
              <input
                type="number"
                name="quantity"
                required
                min={listing.minAlim ?? 1}
                max={listing.maxAlim ?? undefined}
                step={listing.alimKatlari ?? 1}
                defaultValue={listing.minAlim ?? 1}
                className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Not (opsiyonel)
              </label>
              <input
                name="message"
                className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          <button className="mt-3 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            Alım Teklifi Ver
          </button>
        </form>
      )}

      {alreadyOffered && !isOwner && (
        <p className="mt-6 text-sm text-slate-400">Bu ilana zaten teklif verdiniz.</p>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-100">
          Teklifler ({listing.offers.length})
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {listing.offers.map((offer) => (
            <li
              key={offer.id}
              className="rounded-lg border border-slate-800 bg-slate-900 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200">
                  {offer.user.pharmacyName}
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  {OFFER_STATUS_LABEL[offer.status]}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {offer.quantity} adet
                {offer.bonusQuantity ? ` (+${offer.bonusQuantity} mal fazlası)` : ""}
                {offer.unitPrice != null ? ` · ${offer.unitPrice.toFixed(2)} ₺/adet` : ""}
                {offer.totalPrice != null ? ` · Toplam: ${offer.totalPrice.toFixed(2)} ₺` : ""}
              </p>
              {offer.message && (
                <p className="mt-1 text-sm text-slate-500">{offer.message}</p>
              )}
              {isOwner && offer.status === "PENDING" && listing.status === "OPEN" && (
                <div className="mt-2 flex gap-2">
                  <form
                    action={respondOfferAction.bind(null, id, listing.id, offer.id, true)}
                  >
                    <button className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500">
                      Kabul Et
                    </button>
                  </form>
                  <form
                    action={respondOfferAction.bind(null, id, listing.id, offer.id, false)}
                  >
                    <button className="rounded-md border border-red-500/40 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10">
                      Reddet
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
          {listing.offers.length === 0 && (
            <p className="text-sm text-slate-400">Henüz teklif yok.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
