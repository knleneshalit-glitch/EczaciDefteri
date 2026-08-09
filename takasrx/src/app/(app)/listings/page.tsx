import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ClipboardList, Plus, CircleDot, CheckCircle2, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Açık",
  MATCHED: "Eşleşti",
  CLOSED: "Kapandı",
};

const STATUS_ICON: Record<string, LucideIcon> = {
  OPEN: CircleDot,
  MATCHED: CheckCircle2,
  CLOSED: Lock,
};

export default async function MyListingsPage() {
  const user = await requireUser();

  const listings = await prisma.listing.findMany({
    where: { userId: user.id },
    include: { group: true, _count: { select: { offers: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            <ClipboardList className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
            Talep Oluştur - Yönet
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Verdiğiniz tüm takas ilanları burada listelenir.
          </p>
        </div>
        <Link
          href="/groups"
          className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Yeni İlan Ver
        </Link>
      </div>

      {listings.length === 0 ? (
        <p className="mt-8 text-sm text-slate-600 dark:text-slate-400">
          Henüz bir ilan vermediniz. Önce bir gruba katılın, ardından{" "}
          <Link href="/groups" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            grubunuzdan yeni ilan verin
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Başlık</th>
                <th className="px-4 py-3">Grup</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Teklif</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => {
                const StatusIcon = STATUS_ICON[l.status];
                return (
                <tr key={l.id} className="border-b border-slate-200 dark:border-slate-800/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{l.title}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{l.group.name}</td>
                  <td className="px-4 py-3">
                    <span className="flex w-fit items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300">
                      <StatusIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {STATUS_LABEL[l.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{l._count.offers}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/groups/${l.groupId}/listings/${l.id}`}
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
