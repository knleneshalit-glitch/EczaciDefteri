"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePharmacy, requireCourier } from "@/lib/require-user";
import { generateShipmentCode } from "@/lib/qrcode";
import { createNotification } from "@/lib/notifications";
import { acceptOffer, rejectOffer, cancelAcceptedOffer } from "@/lib/offers";

export type UploadBarcodesState = { error?: string } | undefined;

export type BulkResult = { done: number; errors: string[] };

const MAX_BULK = 500;

/** Satıcı eczaneye ait (kendi ilanlarına gelen) teklifleri sevkiyat bilgisiyle getirir. */
async function loadSellerOffers(sellerId: string, offerIds: string[]) {
  const ids = Array.from(new Set(offerIds)).slice(0, MAX_BULK);
  return prisma.offer.findMany({
    where: { id: { in: ids }, listing: { userId: sellerId } },
    include: { listing: true, shipment: true, user: true },
  });
}

async function notifyCouriers(pharmacy: { id: string; pharmacyName: string | null; contactName: string }, count: number) {
  if (count === 0) return;
  const assignedCouriers = await prisma.courierAssignment.findMany({
    where: { pharmacyId: pharmacy.id },
    select: { courierId: true },
  });
  await Promise.all(
    assignedCouriers.map((a) =>
      createNotification({
        userId: a.courierId,
        message: `${pharmacy.pharmacyName ?? pharmacy.contactName} eczanesinden ${count} sevkiyat transfere hazır.`,
        link: "/courier/dashboard",
      })
    )
  );
}

function revalidateShipmentViews() {
  revalidatePath("/offers/received");
  revalidatePath("/offers/sent");
  revalidatePath("/shipments");
  revalidatePath("/courier/dashboard");
}

function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Beklenmeyen bir hata oluştu.";
}

/** Gönderimlerim ekranından seçilen bekleyen teklifleri toplu kabul/red eder. */
export async function bulkRespondOffersAction(offerIds: string[], accept: boolean): Promise<BulkResult> {
  const pharmacy = await requirePharmacy();
  const offers = await loadSellerOffers(pharmacy.id, offerIds);
  const result: BulkResult = { done: 0, errors: [] };

  for (const offer of offers) {
    if (offer.status !== "PENDING") continue;
    try {
      // Her kabulde stok güncel kalsın diye ilan tekrar okunur.
      const listing = await prisma.listing.findUniqueOrThrow({ where: { id: offer.listingId } });
      if (accept) await acceptOffer(listing, offer, pharmacy.id);
      else await rejectOffer(listing, offer);
      result.done++;
      revalidatePath(`/groups/${listing.groupId}/listings/${listing.id}`);
    } catch (e) {
      result.errors.push(`${offer.user.pharmacyName ?? offer.user.contactName}: ${errorMessage(e)}`);
    }
  }

  revalidateShipmentViews();
  return result;
}

/**
 * Seçilen kabul edilmiş teklifleri sevkiyata verir: sevkiyat kaydı yoksa
 * oluşturulur ve transfere hazır işaretlenir (sevkiyatçının ekranına düşer).
 */
export async function bulkSendShipmentsAction(offerIds: string[]): Promise<BulkResult> {
  const pharmacy = await requirePharmacy();
  const offers = await loadSellerOffers(pharmacy.id, offerIds);
  const result: BulkResult = { done: 0, errors: [] };
  const now = new Date();

  for (const offer of offers) {
    if (offer.status !== "ACCEPTED") continue;
    if (offer.shipment?.printedAt) continue;
    if (offer.shipment) {
      await prisma.shipment.update({ where: { id: offer.shipment.id }, data: { printedAt: now } });
    } else {
      await prisma.shipment.create({ data: { offerId: offer.id, code: generateShipmentCode(), printedAt: now } });
    }
    await createNotification({
      userId: offer.userId,
      message: `${pharmacy.pharmacyName ?? pharmacy.contactName} eczanesi "${offer.listing.title}" (${offer.quantity} adet) ürününüzü sevkiyata verdi.`,
      link: "/offers/sent",
    });
    result.done++;
  }

  await notifyCouriers(pharmacy, result.done);
  revalidateShipmentViews();
  return result;
}

/** Henüz sevkiyatçı teslim almadıysa gönderimi sevkiyat listesinden geri çeker. */
export async function bulkRemoveFromShipmentAction(offerIds: string[]): Promise<BulkResult> {
  const pharmacy = await requirePharmacy();
  const offers = await loadSellerOffers(pharmacy.id, offerIds);
  const result: BulkResult = { done: 0, errors: [] };

  for (const offer of offers) {
    if (!offer.shipment?.printedAt) continue;
    if (offer.shipment.status !== "HAZIRLANIYOR") {
      result.errors.push(`${offer.listing.title}: sevkiyatçı teslim aldığı için sevkiyattan çıkarılamaz.`);
      continue;
    }
    await prisma.shipment.update({
      where: { id: offer.shipment.id },
      data: { printedAt: null, courierId: null },
    });
    result.done++;
  }

  revalidateShipmentViews();
  return result;
}

/** Kabul edilmiş, sevkiyatçı tarafından henüz alınmamış gönderimleri iptal eder. */
export async function bulkCancelOffersAction(offerIds: string[]): Promise<BulkResult> {
  const pharmacy = await requirePharmacy();
  const offers = await loadSellerOffers(pharmacy.id, offerIds);
  const result: BulkResult = { done: 0, errors: [] };

  for (const offer of offers) {
    if (offer.status !== "ACCEPTED") continue;
    try {
      const listing = await prisma.listing.findUniqueOrThrow({ where: { id: offer.listingId } });
      await cancelAcceptedOffer(listing, offer, pharmacy.pharmacyName ?? pharmacy.contactName);
      result.done++;
      revalidatePath(`/groups/${listing.groupId}/listings/${listing.id}`);
      revalidatePath(`/groups/${listing.groupId}/balances`);
    } catch (e) {
      result.errors.push(errorMessage(e));
    }
  }

  revalidateShipmentViews();
  return result;
}

/** Etiket basmak için seçilen kabul edilmiş tekliflerin sevkiyat kayıtlarını hazırlar. */
export async function ensureShipmentsAction(offerIds: string[]): Promise<{ shipmentIds: string[] }> {
  const pharmacy = await requirePharmacy();
  const offers = await loadSellerOffers(pharmacy.id, offerIds);
  const shipmentIds: string[] = [];

  for (const offer of offers) {
    if (offer.status !== "ACCEPTED") continue;
    if (offer.shipment) {
      shipmentIds.push(offer.shipment.id);
    } else {
      const created = await prisma.shipment.create({ data: { offerId: offer.id, code: generateShipmentCode() } });
      shipmentIds.push(created.id);
    }
  }

  revalidateShipmentViews();
  return { shipmentIds };
}

/** Toplu etiket yazdırıldığında sevkiyatları transfere hazır işaretler. */
export async function markShipmentsPrintedAction(shipmentIds: string[]) {
  const pharmacy = await requirePharmacy();
  const ids = Array.from(new Set(shipmentIds)).slice(0, MAX_BULK);

  const shipments = await prisma.shipment.findMany({
    where: { id: { in: ids }, printedAt: null, offer: { listing: { userId: pharmacy.id } } },
    select: { id: true },
  });
  if (shipments.length > 0) {
    await prisma.shipment.updateMany({
      where: { id: { in: shipments.map((s) => s.id) } },
      data: { printedAt: new Date() },
    });
    await notifyCouriers(pharmacy, shipments.length);
  }

  revalidateShipmentViews();
}

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

export async function skipBarcodeUploadAction(
  groupId: string,
  listingId: string,
  offerId: string
) {
  const pharmacy = await requirePharmacy();

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.groupId !== groupId || listing.userId !== pharmacy.id) {
    throw new Error("Bu ilana ait değilsiniz.");
  }

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { shipment: true },
  });
  if (!offer || offer.listingId !== listingId || offer.status !== "ACCEPTED") {
    throw new Error("Geçersiz teklif.");
  }

  if (!offer.shipment) {
    await prisma.shipment.create({
      data: { offerId, code: generateShipmentCode() },
    });

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
  }

  revalidatePath(`/groups/${groupId}/listings/${listingId}`);
  redirect(`/groups/${groupId}/listings/${listingId}/offers/${offerId}/label`);
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

function generatePackageCode() {
  return `KOLI-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

/**
 * "Birden Fazla Ürünü Tek Kolide Etiketle": aynı eczaneye giden seçili
 * gönderimleri tek koli koduyla birleştirir ve etiket için sevkiyatları döndürür.
 */
export async function bulkPackShipmentsAction(
  offerIds: string[]
): Promise<{ shipmentIds: string[]; error?: string }> {
  const pharmacy = await requirePharmacy();
  const offers = (await loadSellerOffers(pharmacy.id, offerIds)).filter((o) => o.status === "ACCEPTED");

  if (offers.length < 2) {
    return { shipmentIds: [], error: "Tek kolide birleştirmek için en az iki kabul edilmiş gönderim seçin." };
  }
  if (new Set(offers.map((o) => o.userId)).size > 1) {
    return { shipmentIds: [], error: "Tek koliye sadece aynı eczaneye giden ürünler konabilir." };
  }
  if (offers.some((o) => o.shipment && o.shipment.status !== "HAZIRLANIYOR")) {
    return { shipmentIds: [], error: "Sevkiyatçının teslim aldığı gönderimler yeniden kolilenemez." };
  }

  const packageCode = generatePackageCode();
  const shipmentIds: string[] = [];
  for (const offer of offers) {
    if (offer.shipment) {
      await prisma.shipment.update({ where: { id: offer.shipment.id }, data: { packageCode } });
      shipmentIds.push(offer.shipment.id);
    } else {
      const created = await prisma.shipment.create({
        data: { offerId: offer.id, code: generateShipmentCode(), packageCode },
      });
      shipmentIds.push(created.id);
    }
  }

  revalidateShipmentViews();
  return { shipmentIds };
}

/** Alıcı eczane, kendisine gelen paketi teslim aldığını onaylar ("Eczacı Teslim Aldı"). */
export async function confirmReceiptAction(shipmentIds: string[]): Promise<BulkResult> {
  const pharmacy = await requirePharmacy();
  const ids = Array.from(new Set(shipmentIds)).slice(0, MAX_BULK);
  const shipments = await prisma.shipment.findMany({
    where: { id: { in: ids }, offer: { userId: pharmacy.id }, status: { not: "TESLIM_EDILDI" } },
    include: { offer: { include: { listing: true } } },
  });
  const result: BulkResult = { done: 0, errors: [] };
  const now = new Date();

  for (const s of shipments) {
    if (!s.printedAt && s.status === "HAZIRLANIYOR") {
      result.errors.push(`${s.offer.listing.title}: gönderen eczane henüz sevkiyata vermedi.`);
      continue;
    }
    await prisma.shipment.update({
      where: { id: s.id },
      data: { status: "TESLIM_EDILDI", deliveredAt: s.deliveredAt ?? now, buyerConfirmedAt: now },
    });
    await createNotification({
      userId: s.offer.listing.userId,
      message: `${pharmacy.pharmacyName ?? pharmacy.contactName} eczanesi "${s.offer.listing.title}" (${s.offer.quantity} adet) ürününü teslim aldı.`,
      link: "/offers/received",
    });
    result.done++;
  }

  revalidateShipmentViews();
  return result;
}

/** Sevkiyatçı bir duraktaki paketleri toplu teslim alır. */
export async function courierPickUpAction(shipmentIds: string[]) {
  const courier = await requireCourier();
  const ids = Array.from(new Set(shipmentIds)).slice(0, MAX_BULK);

  const assignments = await prisma.courierAssignment.findMany({
    where: { courierId: courier.id },
    select: { pharmacyId: true },
  });
  const pharmacyIds = assignments.map((a) => a.pharmacyId);

  const shipments = await prisma.shipment.findMany({
    where: {
      id: { in: ids },
      status: "HAZIRLANIYOR",
      printedAt: { not: null },
      offer: { listing: { userId: { in: pharmacyIds } } },
    },
    include: { offer: { include: { listing: true } } },
  });
  if (shipments.length === 0) throw new Error("Teslim alınacak geçerli bir sevkiyat bulunamadı.");

  const now = new Date();
  await prisma.shipment.updateMany({
    where: { id: { in: shipments.map((s) => s.id) } },
    data: { courierId: courier.id, status: "TESLIM_ALINDI", pickedUpAt: now },
  });

  const bySeller = new Map<string, number>();
  for (const s of shipments) bySeller.set(s.offer.listing.userId, (bySeller.get(s.offer.listing.userId) ?? 0) + 1);
  await Promise.all([
    ...Array.from(bySeller.entries()).map(([sellerId, count]) =>
      createNotification({
        userId: sellerId,
        message: `Sevkiyat aracı eczanenize uğradı: ${courier.contactName} ${count} paketi teslim aldı.`,
        link: "/shipments",
      })
    ),
    ...shipments.map((s) =>
      createNotification({
        userId: s.offer.userId,
        message: `"${s.offer.listing.title}" (${s.offer.quantity} adet) sevkiyatçıya teslim edildi, yolda.`,
        link: "/shipments?tab=aktif",
      })
    ),
  ]);

  revalidateShipmentViews();
}

/** Sevkiyatçı bir duraktaki paketleri alıcı eczaneye toplu teslim eder. */
export async function courierDeliverAction(shipmentIds: string[]) {
  const courier = await requireCourier();
  const ids = Array.from(new Set(shipmentIds)).slice(0, MAX_BULK);

  const shipments = await prisma.shipment.findMany({
    where: { id: { in: ids }, status: "TESLIM_ALINDI", courierId: courier.id },
    include: { offer: { include: { listing: true, user: true } } },
  });
  if (shipments.length === 0) throw new Error("Teslim edilecek geçerli bir sevkiyat bulunamadı.");

  const now = new Date();
  await prisma.shipment.updateMany({
    where: { id: { in: shipments.map((s) => s.id) } },
    data: { status: "TESLIM_EDILDI", deliveredAt: now },
  });

  const byBuyer = new Map<string, number>();
  for (const s of shipments) byBuyer.set(s.offer.userId, (byBuyer.get(s.offer.userId) ?? 0) + 1);
  await Promise.all([
    ...Array.from(byBuyer.entries()).map(([buyerId, count]) =>
      createNotification({
        userId: buyerId,
        message: `Sevkiyat aracı eczanenize ulaştı: ${count} paket teslim edildi.`,
        link: "/shipments?tab=gecmis",
      })
    ),
    ...shipments.map((s) =>
      createNotification({
        userId: s.offer.listing.userId,
        message: `${s.offer.user.pharmacyName ?? s.offer.user.contactName} eczanesine teslimat tamamlandı: ${s.offer.listing.title}.`,
        link: "/offers/received",
      })
    ),
  ]);

  revalidateShipmentViews();
}
