"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePharmacy, requireCourier } from "@/lib/require-user";
import { generateShipmentCode } from "@/lib/qrcode";
import { createNotification } from "@/lib/notifications";

export type UploadBarcodesState = { error?: string } | undefined;

export async function uploadShipmentBarcodesAction(
  groupId: string,
  listingId: string,
  offerId: string,
  _prevState: UploadBarcodesState,
  formData: FormData
): Promise<UploadBarcodesState> {
  const pharmacy = await requirePharmacy();

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.groupId !== groupId || listing.userId !== pharmacy.id) {
    return { error: "Bu ilana ait değilsiniz." };
  }

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { shipment: true },
  });
  if (!offer || offer.listingId !== listingId || offer.status !== "ACCEPTED") {
    return { error: "Geçersiz teklif." };
  }

  const raw = String(formData.get("barcodes") ?? "");
  const codes = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (codes.length === 0) {
    return { error: "En az bir karekod girin." };
  }

  const barcodes = codes.join("\n");

  if (offer.shipment) {
    await prisma.shipment.update({
      where: { id: offer.shipment.id },
      data: { barcodes, barcodesUploadedAt: new Date() },
    });
  } else {
    await prisma.shipment.create({
      data: { offerId, code: generateShipmentCode(), barcodes, barcodesUploadedAt: new Date() },
    });
  }

  const assignedCouriers = await prisma.courierAssignment.findMany({
    where: { pharmacyId: pharmacy.id },
    select: { courierId: true },
  });
  await Promise.all(
    assignedCouriers.map((a) =>
      createNotification({
        userId: a.courierId,
        message: `${pharmacy.pharmacyName ?? pharmacy.contactName} eczanesinden yeni bir sevkiyat hazır.`,
        link: "/courier/dashboard",
      })
    )
  );

  revalidatePath(`/groups/${groupId}/listings/${listingId}`);
  revalidatePath(`/groups/${groupId}/listings/${listingId}/offers/${offerId}/prepare`);
}

export async function markLabelPrintedAction(shipmentId: string) {
  const pharmacy = await requirePharmacy();

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: { offer: { include: { listing: true } } },
  });
  if (!shipment || shipment.offer.listing.userId !== pharmacy.id) {
    throw new Error("Bu sevkiyata ait değilsiniz.");
  }

  if (!shipment.printedAt) {
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: { printedAt: new Date() },
    });

    const assignedCouriers = await prisma.courierAssignment.findMany({
      where: { pharmacyId: pharmacy.id },
      select: { courierId: true },
    });
    await Promise.all(
      assignedCouriers.map((a) =>
        createNotification({
          userId: a.courierId,
          message: `${pharmacy.pharmacyName ?? pharmacy.contactName} eczanesinden bir sevkiyat transfere hazır.`,
          link: "/courier/dashboard",
        })
      )
    );
  }

  revalidatePath(
    `/groups/${shipment.offer.listing.groupId}/listings/${shipment.offer.listingId}/offers/${shipment.offerId}/prepare`
  );
  revalidatePath("/courier/dashboard");
}

export async function markPickedUpAction(shipmentId: string) {
  const courier = await requireCourier();

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: { offer: { include: { listing: { include: { user: true } }, user: true } } },
  });
  if (!shipment || shipment.status !== "HAZIRLANIYOR") {
    throw new Error("Geçersiz sevkiyat.");
  }

  const assignment = await prisma.courierAssignment.findUnique({
    where: {
      courierId_pharmacyId: {
        courierId: courier.id,
        pharmacyId: shipment.offer.listing.userId,
      },
    },
  });
  if (!assignment) {
    throw new Error("Bu eczaneye atanmış bir sevkiyatçı değilsiniz.");
  }

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: { courierId: courier.id, status: "TESLIM_ALINDI", pickedUpAt: new Date() },
  });

  await createNotification({
    userId: shipment.offer.listing.userId,
    message: `${courier.contactName} sevkiyatı teslim aldı: ${shipment.offer.listing.title}.`,
    link: `/groups/${shipment.offer.listing.groupId}/listings/${shipment.offer.listingId}`,
  });

  revalidatePath("/courier/dashboard");
}

export async function markDeliveredAction(shipmentId: string) {
  const courier = await requireCourier();

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: { offer: { include: { listing: true, user: true } } },
  });
  if (!shipment || shipment.status !== "TESLIM_ALINDI" || shipment.courierId !== courier.id) {
    throw new Error("Geçersiz sevkiyat.");
  }

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: { status: "TESLIM_EDILDI", deliveredAt: new Date() },
  });

  await Promise.all([
    createNotification({
      userId: shipment.offer.listing.userId,
      message: `${shipment.offer.user.pharmacyName ?? shipment.offer.user.contactName} eczanesine teslimat tamamlandı: ${shipment.offer.listing.title}.`,
      link: `/groups/${shipment.offer.listing.groupId}/listings/${shipment.offer.listingId}`,
    }),
    createNotification({
      userId: shipment.offer.userId,
      message: `Siparişiniz teslim edildi: ${shipment.offer.listing.title}.`,
      link: `/groups/${shipment.offer.listing.groupId}/listings/${shipment.offer.listingId}`,
    }),
  ]);

  revalidatePath("/courier/dashboard");
}
