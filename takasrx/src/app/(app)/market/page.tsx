import Link from "next/link";
import { ShoppingBag, Package, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { effectiveUnitPrice } from "@/lib/pricing";
import { closeExpiredTargetListingsForGroups } from "@/lib/listings";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Açık",
  MATCHED: "Eşleşti",
  CLOSED: "Kapandı",
};

export default async function MarketPage() {
  const user = await requireUser();

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id, status: "APPROVED" },
    select: { groupId: true },
  });
  const groupIds = memberships.map((m) => m.groupId);

  await closeExpiredTargetListingsForGroups(groupIds);

  const listings = user.isSuperAdmin
    ? await prisma.listing.findMany({
        where: { status: "OPEN" },
        include: {
          group: true,
          user: true,
          offers: { where: { status: "ACCEPTED" }, select: { quantity: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : await prisma.listing.findMany({
        where: { status: "OPEN", groupId: { in: groupIds } },
        include: {
          group: true,
          user: true,
          offers: { where: { status: "ACCEPTED" }, select: { quantity: true } },
        },
        orderBy: { createdAt: "desc" },
      });

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <ShoppingBag className="h-6 w-6 text-orange-500" strokeWidth={1.75} />
        Gruptaki Aktif Teklifler
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Üye olduğunuz tüm gruplardaki açık ilanlar tek sayfada.
      </p>

      {listings.length === 0 ? (
        <p className="mt-8 text-sm text-slate-600 dark:text-slate-400">
          Şu anda hiçbir grubunuzda açık ilan yok.{" "}
          <Link href="/groups" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            Gruplarınıza göz atın.
          </Link>
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {listings.map((listing) => {
            const acceptedQty = listing.offers.reduce((sum, o) => sum + o.quantity, 0);
            const remaining = listing.totalStock != null ? Math.max(0, listing.totalStock - acceptedQty) : null;
            const hasBonus =
              listing.dealBonusQuantity != null &&
              listing.totalStock != null &&
              listing.dealBonusQuantity > 0 &&
              listing.dealBonusQuantity < listing.totalStock;
            const netFiyat = effectiveUnitPrice(listing);
            const daysLeft = listing.endDate
              ? Math.ceil((listing.endDate.getTime() - Date.now()) / 86400000)
              : null;
            const targetReached = listing.status === "OPEN" && listing.targetReachedAt != null;

            return (
              <Link
                key={listing.id}
                href={`/groups/${listing.groupId}/listings/${listing.id}`}
                className={`flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border px-6 py-5 shadow-sm transition hover:shadow-md ${
                  targetReached
                    ? "border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-600"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400"
                }`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 text-white">
                  <Package className="h-6 w-6" strokeWidth={1.75} />
                </span>

                <div className="min-w-[200px] flex-1">
                  <p className={`font-semibold ${targetReached ? "text-white" : "text-slate-900 dark:text-slate-100"}`}>
                    {listing.medicineName}
                  </p>
                  <p className={`text-xs ${targetReached ? "text-emerald-50" : "text-slate-500"}`}>
                    {listing.barkod ?? "—"} · {listing.user.pharmacyName ?? listing.user.contactName} · {listing.group.name}
                  </p>
                  <p className={`mt-0.5 text-[11px] ${targetReached ? "text-emerald-100" : "text-slate-400"}`}>
                    İlan Tarihi: {listing.createdAt.toLocaleDateString("tr-TR")}
                  </p>
                </div>

                {hasBonus && (
                  <div className="text-center">
                    <span className="rounded-full border-2 border-orange-400 bg-orange-100 dark:bg-orange-500/20 px-2.5 py-0.5 text-xs font-bold text-orange-700 dark:text-orange-400">
                      {listing.totalStock! - listing.dealBonusQuantity!}+{listing.dealBonusQuantity} MF
                    </span>
                    {listing.expiryDate && (
                      <p className={`mt-1 text-[11px] ${targetReached ? "text-emerald-50" : "text-slate-500"}`}>
                        Miad: {listing.expiryDate.toLocaleDateString("tr-TR")}
                      </p>
                    )}
                  </div>
                )}

                {listing.totalStock != null && (
                  <div className="text-center">
                    <p className={`text-xs ${targetReached ? "text-emerald-50" : "text-slate-500"}`}>Kalan</p>
                    <p className={`font-semibold ${targetReached ? "text-white" : "text-slate-800 dark:text-slate-200"}`}>
                      {remaining} / {listing.totalStock}
                    </p>
                  </div>
                )}

                <div className="text-center">
                  {netFiyat != null && (
                    <p className={`font-bold ${targetReached ? "text-white" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {netFiyat.toFixed(2)} ₺ Net
                    </p>
                  )}
                  {hasBonus && listing.birimFiyat != null && (
                    <p className={`text-xs line-through ${targetReached ? "text-emerald-100" : "text-slate-500"}`}>
                      {listing.birimFiyat.toFixed(2)} ₺ Depo
                    </p>
                  )}
                </div>

                {daysLeft != null && daysLeft >= 0 && (
                  <p className={`text-xs font-medium ${targetReached ? "text-white" : "text-amber-600 dark:text-amber-400"}`}>
                    {daysLeft} gün kaldı
                  </p>
                )}

                <span
                  className={`ml-auto flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-semibold ${
                    targetReached ? "bg-white text-emerald-700" : "bg-emerald-600 text-white"
                  }`}
                >
                  {targetReached
                    ? "Hedefe Ulaşıldı"
                    : STATUS_LABEL[listing.status] === "Açık"
                      ? "KATIL"
                      : STATUS_LABEL[listing.status]}
                  {!targetReached && STATUS_LABEL[listing.status] === "Açık" && (
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                </span>

                {listing.description && (
                  <p
                    className={`mt-1 w-full border-t pt-3 text-xs ${
                      targetReached
                        ? "border-emerald-400/50 text-emerald-50"
                        : "border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {listing.description}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
