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
    include: {
      offers: {
        where: { status: { in: ["PENDING", "ACCEPTED"] } },
        include: { shipment: true },
      },
    },
  });
  if (!listing || listing.groupId !== id || listing.userId !== user.id) notFound();

  const hasShippedOffers = listing.offers.some((o) => o.shipment != null);

  return (
    <EditListingForm
      groupId={id}
      listingId={listingId}
      hasShippedOffers={hasShippedOffers}
      defaults={{
        medicineName: listing.medicineName,
        barkod: listing.barkod ?? "",
        quantity: listing.quantity ?? "",
        description: listing.description ?? "",
        birimFiyat: listing.birimFiyat ?? 0,
        totalStock: listing.totalStock ?? 0,
        dealBonusQuantity: listing.dealBonusQuantity ?? 0,
        ekstraIndirim: listing.ekstraIndirim ?? undefined,
        ekstraIskontoYuzde: listing.ekstraIskontoYuzde ?? undefined,
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
