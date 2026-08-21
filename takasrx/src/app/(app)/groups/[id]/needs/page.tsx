import Link from "next/link";
import { notFound } from "next/navigation";
import { HelpCircle, Plus, Clock, CheckCircle2, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { requireApprovedMember } from "@/lib/group-access";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Açık",
  FULFILLED: "Karşılandı",
  CLOSED: "Kapandı",
};

const STATUS_ICON: Record<string, LucideIcon> = {
  OPEN: Clock,
  FULFILLED: CheckCircle2,
  CLOSED: Lock,
};

export default async function GroupNeedsPage(props: PageProps<"/groups/[id]/needs">) {
  const user = await requireUser();
  const { id } = await props.params;
  await requireApprovedMember(id, user);

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) notFound();

  const needs = await prisma.needRequest.findMany({
    where: { groupId: id },
    include: { user: true, _count: { select: { responses: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
          <HelpCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
          İhtiyaç Bildirimleri
        </h1>
        <Link
          href={`/groups/${id}/needs/new`}
          className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Yeni İhtiyaç Bildir
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Elinizde olmayan ama ihtiyacınız olan ürünü bildirin; grup üyeleri size teklif versin.
      </p>

      <ul className="mt-6 flex flex-col gap-3">
        {needs.map((n) => {
          const StatusIcon = STATUS_ICON[n.status];
          return (
            <li key={n.id}>
              <Link
                href={`/groups/${id}/needs/${n.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 hover:border-emerald-500 dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{n.title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {n.medicineName}
                    {n.quantity ? ` · ${n.quantity} adet` : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {n.user.pharmacyName} · {n._count.responses} teklif
                  </p>
                </div>
                <span className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <StatusIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {STATUS_LABEL[n.status]}
                </span>
              </Link>
            </li>
          );
        })}
        {needs.length === 0 && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Bu grupta henüz ihtiyaç bildirimi yok.
          </p>
        )}
      </ul>
    </div>
  );
}
