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
    },
  });
  if (!listing || listing.groupId !== id) notFound();

  const isOwner = listing.userId === user.id;
  const alreadyOffered = listing.offers.some((o) => o.userId === user.id);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">{listing.title}</h1>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {STATUS_LABEL[listing.status]}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-700">
          <span className="font-medium">İlaç:</span> {listing.medicineName}
        </p>
        {listing.quantity && (
          <p className="text-sm text-slate-700">
            <span className="font-medium">Miktar:</span> {listing.quantity}
          </p>
        )}
        {listing.expiryDate && (
          <p className="text-sm text-slate-700">
            <span className="font-medium">SKT:</span>{" "}
            {listing.expiryDate.toLocaleDateString("tr-TR")}
          </p>
        )}
        {listing.description && (
          <p className="mt-2 text-sm text-slate-600">{listing.description}</p>
        )}
        <p className="mt-3 text-xs text-slate-400">
          İlan sahibi: {listing.user.pharmacyName}
        </p>
      </div>

      {!isOwner && !alreadyOffered && listing.status === "OPEN" && (
        <form
          action={createOfferAction.bind(null, id, listing.id)}
          className="mt-6 rounded-lg border border-slate-200 bg-white p-4"
        >
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Teklif Mesajınız
          </label>
          <textarea
            name="message"
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            placeholder="Karşılığında şunu teklif ediyorum..."
          />
          <button className="mt-3 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Teklif Ver
          </button>
        </form>
      )}

      {alreadyOffered && !isOwner && (
        <p className="mt-6 text-sm text-slate-600">Bu ilana zaten teklif verdiniz.</p>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">
          Teklifler ({listing.offers.length})
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {listing.offers.map((offer) => (
            <li
              key={offer.id}
              className="rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">
                  {offer.user.pharmacyName}
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {OFFER_STATUS_LABEL[offer.status]}
                </span>
              </div>
              {offer.message && (
                <p className="mt-1 text-sm text-slate-600">{offer.message}</p>
              )}
              {isOwner && offer.status === "PENDING" && listing.status === "OPEN" && (
                <div className="mt-2 flex gap-2">
                  <form
                    action={respondOfferAction.bind(null, id, listing.id, offer.id, true)}
                  >
                    <button className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700">
                      Kabul Et
                    </button>
                  </form>
                  <form
                    action={respondOfferAction.bind(null, id, listing.id, offer.id, false)}
                  >
                    <button className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                      Reddet
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
          {listing.offers.length === 0 && (
            <p className="text-sm text-slate-600">Henüz teklif yok.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
