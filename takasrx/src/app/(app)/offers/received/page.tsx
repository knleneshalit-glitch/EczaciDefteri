import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Inbox, Clock, CheckCircle2, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { statusBadgeClass } from "@/lib/status-styles";
import { requireUser } from "@/lib/require-user";

const OFFER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Bekliyor",
  ACCEPTED: "Kabul Edildi",
  REJECTED: "Reddedildi",
};

const OFFER_STATUS_ICON: Record<string, LucideIcon> = {
  PENDING: Clock,
  ACCEPTED: CheckCircle2,
  REJECTED: XCircle,
};

export default async function ReceivedOffersPage() {
  const user = await requireUser();

  const offers = await prisma.offer.findMany({
    where: { listing: { userId: user.id } },
    include: { listing: { include: { group: true } }, user: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <Inbox className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Gönderimlerim
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        İlanlarınıza grup üyelerinin verdiği alım teklifleri.
      </p>

      {offers.length === 0 ? (
        <p className="mt-8 text-sm text-slate-600 dark:text-slate-400">Henüz gelen teklif yok.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">İlan</th>
                <th className="px-4 py-3">Teklif Veren</th>
                <th className="px-4 py-3">Miktar</th>
                <th className="px-4 py-3">Tutar</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => {
                const StatusIcon = OFFER_STATUS_ICON[o.status];
                return (
                <tr key={o.id} className="border-b border-slate-200 dark:border-slate-800/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {o.listing.title}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{o.user.pharmacyName}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{o.quantity}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {o.totalPrice != null ? `${o.totalPrice.toFixed(2)} ₺` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex w-fit items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(o.status)}`}>
                      <StatusIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {OFFER_STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/groups/${o.listing.groupId}/listings/${o.listingId}`}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Görüntüle
                    </Link>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
