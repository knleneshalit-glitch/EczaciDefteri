import { Inbox } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { effectiveUnitPrice } from "@/lib/pricing";
import ShipmentsBoard, { type BoardLine, type BoardProduct } from "./ShipmentsBoard";

export default async function ReceivedOffersPage() {
  const user = await requireUser();

  const offers = await prisma.offer.findMany({
    where: {
      listing: { userId: user.id, listingKind: "STOK" },
      status: { in: ["PENDING", "ACCEPTED"] },
    },
    include: {
      listing: { include: { group: { select: { name: true } } } },
      user: true,
      shipment: { include: { courier: { select: { contactName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const products = new Map<string, BoardProduct>();
  const lines: BoardLine[] = offers.map((o) => {
    const l = o.listing;
    if (!products.has(l.id)) {
      const hasBonus =
        l.dealBonusQuantity != null && l.totalStock != null && l.dealBonusQuantity > 0 && l.dealBonusQuantity < l.totalStock;
      const extras: string[] = [];
      if (l.ekstraIskontoYuzde) extras.push(`%${l.ekstraIskontoYuzde}`);
      if (l.ekstraIndirim) extras.push(`${l.ekstraIndirim.toFixed(0)} ₺`);
      products.set(l.id, {
        listingId: l.id,
        groupId: l.groupId,
        groupName: l.group.name,
        medicineName: l.medicineName,
        barkod: l.barkod,
        createdAt: l.createdAt,
        expiryDate: l.expiryDate,
        birimFiyat: l.birimFiyat,
        netFiyat: effectiveUnitPrice(l),
        kdvOrani: l.kdvOrani,
        terms: hasBonus ? `${l.totalStock! - l.dealBonusQuantity!}+${l.dealBonusQuantity}` : "—",
        extra: extras.length ? extras.join(" + ") : "—",
        totalStock: l.totalStock,
      });
    }
    return {
      offerId: o.id,
      listingId: l.id,
      groupId: l.groupId,
      status: o.status as "PENDING" | "ACCEPTED",
      quantity: o.quantity,
      unitPrice: o.unitPrice,
      totalPrice: o.totalPrice,
      message: o.message,
      createdAt: o.createdAt,
      acceptedAt: o.acceptedAt,
      buyer: {
        id: o.user.id,
        name: o.user.pharmacyName ?? o.user.contactName,
        gln: o.user.gln,
        contactName: o.user.contactName,
        email: o.user.email,
        region: o.user.region,
        district: o.user.district,
        address: o.user.address,
      },
      shipment: o.shipment
        ? {
            id: o.shipment.id,
            code: o.shipment.code,
            status: o.shipment.status,
            printedAt: o.shipment.printedAt,
            courierName: o.shipment.courier?.contactName ?? null,
            barcodeCount: o.shipment.barcodes ? o.shipment.barcodes.split("\n").filter(Boolean).length : 0,
          }
        : null,
    };
  });

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <Inbox className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Gönderimlerim
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        İlanlarınıza gelen alım teklifleri ve gönderim durumları. Ürün ya da eczane seçip sağ
        panelden toplu işlem yapabilirsiniz.
      </p>

      {lines.length === 0 ? (
        <p className="mt-8 text-sm text-slate-600 dark:text-slate-400">Henüz gelen teklif yok.</p>
      ) : (
        <ShipmentsBoard products={Array.from(products.values())} lines={lines} />
      )}
    </div>
  );
}
