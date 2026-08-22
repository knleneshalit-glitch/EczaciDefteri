"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Package, ArrowRight } from "lucide-react";
import { effectiveUnitPrice } from "@/lib/pricing";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Açık",
  MATCHED: "Eşleşti",
  CLOSED: "Kapandı",
};

export type MarketListing = {
  id: string;
  groupId: string;
  medicineName: string;
  barkod: string | null;
  status: string;
  createdAt: Date;
  endDate: Date | null;
  expiryDate: Date | null;
  totalStock: number | null;
  dealBonusQuantity: number | null;
  birimFiyat: number | null;
  ekstraIndirim: number | null;
  ekstraIskontoYuzde: number | null;
  targetReachedAt: Date | null;
  listingKind: string;
  targetUserId: string | null;
  description: string | null;
  group: { name: string };
  user: { pharmacyName: string | null; contactName: string };
  offers: { quantity: number }[];
};

export default function MarketListings({ listings }: { listings: MarketListing[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    if (!q) return listings;
    return listings.filter((listing) => {
      const pharmacy = (listing.user.pharmacyName ?? listing.user.contactName).toLocaleLowerCase("tr-TR");
      const medicine = listing.medicineName.toLocaleLowerCase("tr-TR");
      const group = listing.group.name.toLocaleLowerCase("tr-TR");
      return medicine.includes(q) || pharmacy.includes(q) || group.includes(q);
    });
  }, [listings, query]);

  return (
    <div>
      <div className="relative mt-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="İlaç adı veya eczane adına göre ara..."
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-sm text-slate-600 dark:text-slate-400">
          Aramanızla eşleşen bir ilan bulunamadı.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {filtered.map((listing) => {
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

            let expiryWarning: { label: string; className: string } | null = null;
            if (listing.expiryDate) {
              const daysUntilExpiry = Math.ceil((listing.expiryDate.getTime() - Date.now()) / 86400000);
              if (daysUntilExpiry < 91) {
                expiryWarning = {
                  label: "3 Ay Altında Miad",
                  className: "border-red-400 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400",
                };
              } else if (daysUntilExpiry < 182) {
                expiryWarning = {
                  label: "6 Ay Altında Miad",
                  className: "border-orange-400 bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400",
                };
              } else if (daysUntilExpiry < 365) {
                expiryWarning = {
                  label: "1 Yıl Altında Miad",
                  className: "border-yellow-400 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400",
                };
              }
            }

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
                  <p
                    className={`flex flex-wrap items-center gap-1.5 font-semibold ${
                      targetReached ? "text-white" : "text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {listing.medicineName}
                    {listing.listingKind === "DEPO_OZEL_SART" && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          targetReached
                            ? "bg-white/20 text-white"
                            : "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400"
                        }`}
                      >
                        Depo Özel Şartı
                      </span>
                    )}
                    {listing.targetUserId && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          targetReached
                            ? "bg-white/20 text-white"
                            : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400"
                        }`}
                      >
                        Eczaneye Özel
                      </span>
                    )}
                    {expiryWarning && (
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${expiryWarning.className}`}>
                        {expiryWarning.label}
                      </span>
                    )}
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
