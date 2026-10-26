import Link from "next/link";
import { Send } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { effectiveUnitPrice } from "@/lib/pricing";
import PurchasesTable, { type PurchaseRow } from "./PurchasesTable";

export default async function SentOffersPage() {
  const user = await requireUser();

  const offers = await prisma.offer.findMany({
    where: { userId: user.id },
    include: {
      listing: { include: { group: { select: { name: true } }, user: true } },
      shipment: { include: { courier: { select: { contactName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: PurchaseRow[] = offers.map((o) => {
    const l = o.listing;
    const netNow = effectiveUnitPrice(l);
    return {
      offerId: o.id,
      listingId: l.id,
      groupId: l.groupId,
      groupName: l.group.name,
      medicineName: l.medicineName,
      barkod: l.barkod,
      expiryDate: l.expiryDate,
      seller: l.user.pharmacyName ?? l.user.contactName,
      status: o.status,
      quantity: o.quantity,
      unitPrice: o.unitPrice,
      totalPrice: o.totalPrice,
      depoFiyati: l.birimFiyat,
      kdvOrani: l.kdvOrani,
      createdAt: o.createdAt,
      acceptedAt: o.acceptedAt,
      priceChanged:
        o.status === "PENDING" && o.unitPrice != null && netNow != null && Math.abs(o.unitPrice - netNow) > 0.001,
      shipment: o.shipment
        ? {
            status: o.shipment.status,
            printedAt: o.shipment.printedAt,
            deliveredAt: o.shipment.deliveredAt,
            courierName: o.shipment.courier?.contactName ?? null,
            barcodeCount: o.shipment.barcodes ? o.shipment.barcodes.split("\n").filter(Boolean).length : 0,
          }
        : null,
    };
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <Send className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Alımlarım
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Başkalarının ilanlarına verdiğiniz alım teklifleri, kazancınız ve gönderim durumları.
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-slate-600 dark:text-slate-400">
          Henüz teklif vermediniz.{" "}
          <Link href="/market" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            Gruptaki aktif tekliflere göz atın.
          </Link>
        </p>
      ) : (
        <PurchasesTable rows={rows} />
      )}
    </div>
  );
}
