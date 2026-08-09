import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import EditListingForm from "./EditListingForm";

function toDateInputValue(d: Date | null) {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export default async function EditListingPage(
  props: PageProps<"/groups/[id]/listings/[listingId]/edit">
) {
  const user = await requireUser();
  const { id, listingId } = await props.params;

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { offers: { where: { status: "ACCEPTED" }, select: { id: true } } },
  });
  if (!listing || listing.groupId !== id || listing.userId !== user.id) notFound();

  return (
    <EditListingForm
      groupId={id}
      listingId={listingId}
      hasAcceptedOffers={listing.offers.length > 0}
      defaults={{
        title: listing.title,
        medicineName: listing.medicineName,
        barkod: listing.barkod ?? "",
        quantity: listing.quantity ?? "",
        description: listing.description ?? "",
        birimFiyat: listing.birimFiyat ?? 0,
        totalStock: listing.totalStock ?? 0,
        dealBonusQuantity: listing.dealBonusQuantity ?? 0,
        etiketFiyati: listing.etiketFiyati ?? undefined,
        startDate: toDateInputValue(listing.startDate),
        endDate: toDateInputValue(listing.endDate),
        minAlim: listing.minAlim ?? undefined,
        maxAlim: listing.maxAlim ?? undefined,
        expiryDate: toDateInputValue(listing.expiryDate),
      }}
    />
  );
}
