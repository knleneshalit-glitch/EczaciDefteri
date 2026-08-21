import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  HelpCircle,
  Send,
  Check,
  X,
  Clock,
  CheckCircle2,
  Lock,
  XCircle,
  MessagesSquare,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { requireApprovedMember } from "@/lib/group-access";
import { statusBadgeClass } from "@/lib/status-styles";
import {
  respondNeedAction,
  acceptNeedResponseAction,
  rejectNeedResponseAction,
  closeNeedAction,
} from "@/app/actions/needs";

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

const RESPONSE_STATUS_LABEL: Record<string, string> = {
  PENDING: "Bekliyor",
  ACCEPTED: "Kabul Edildi",
  REJECTED: "Reddedildi",
};

const RESPONSE_STATUS_ICON: Record<string, LucideIcon> = {
  PENDING: Clock,
  ACCEPTED: CheckCircle2,
  REJECTED: XCircle,
};

export default async function NeedDetailPage(props: PageProps<"/groups/[id]/needs/[needId]">) {
  const user = await requireUser();
  const { id, needId } = await props.params;
  await requireApprovedMember(id, user);

  const need = await prisma.needRequest.findUnique({
    where: { id: needId },
    include: {
      user: true,
      responses: { include: { user: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!need || need.groupId !== id) notFound();

  const isOwner = need.userId === user.id;
  const alreadyResponded = need.responses.some((r) => r.userId === user.id);
  const StatusIcon = STATUS_ICON[need.status];

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
            <HelpCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
            {need.title}
          </h1>
          <div className="flex items-center gap-2">
            {isOwner && need.status === "OPEN" && (
              <form action={closeNeedAction.bind(null, id, needId)}>
                <button className="flex items-center gap-1 rounded-md border border-red-500/40 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400">
                  <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Kapat
                </button>
              </form>
            )}
            <span className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(need.status)}`}>
              <StatusIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {STATUS_LABEL[need.status]}
            </span>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          <span className="font-medium">İlaç:</span> {need.medicineName}
          {need.barkod ? ` · ${need.barkod}` : ""}
        </p>
        {need.quantity && (
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-medium">İstenen Miktar:</span> {need.quantity} adet
          </p>
        )}
        {need.description && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{need.description}</p>
        )}
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
          Bildiren: {need.user.pharmacyName}
        </p>
      </div>

      {!isOwner && !alreadyResponded && need.status === "OPEN" && (
        <form
          action={respondNeedAction.bind(null, id, needId)}
          className="mt-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Verebileceğiniz Miktar
              </label>
              <input
                type="number"
                name="quantity"
                required
                min={1}
                defaultValue={need.quantity ?? 1}
                className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Birim Fiyat (₺, opsiyonel)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                name="unitPrice"
                className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Not (opsiyonel)
            </label>
            <input
              name="message"
              className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100"
            />
          </div>
          <button className="mt-3 flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            <Send className="h-4 w-4" strokeWidth={1.75} />
            Teklif Ver
          </button>
        </form>
      )}

      {alreadyResponded && !isOwner && (
        <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
          Bu ihtiyaca zaten teklif verdiniz.
        </p>
      )}

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <MessagesSquare className="h-4 w-4 text-slate-600 dark:text-slate-400" strokeWidth={1.75} />
          Teklifler ({need.responses.length})
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {need.responses.map((r) => {
            const RespIcon = RESPONSE_STATUS_ICON[r.status];
            return (
              <li
                key={r.id}
                className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {r.user.pharmacyName}
                  </span>
                  <span className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(r.status)}`}>
                    <RespIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {RESPONSE_STATUS_LABEL[r.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {r.quantity} adet
                  {r.unitPrice != null ? ` · ${r.unitPrice.toFixed(2)} ₺/adet` : ""}
                  {r.totalPrice != null ? ` · Toplam: ${r.totalPrice.toFixed(2)} ₺` : ""}
                </p>
                {r.message && (
                  <p className="mt-1 text-sm text-slate-500">{r.message}</p>
                )}
                {isOwner && r.status === "PENDING" && need.status === "OPEN" && (
                  <div className="mt-2 flex gap-2">
                    <form action={acceptNeedResponseAction.bind(null, id, needId, r.id)}>
                      <button className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500">
                        <Check className="h-3.5 w-3.5" strokeWidth={2} />
                        Kabul Et
                      </button>
                    </form>
                    <form action={rejectNeedResponseAction.bind(null, id, needId, r.id)}>
                      <button className="flex items-center gap-1 rounded-md border border-red-500/40 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400">
                        <X className="h-3.5 w-3.5" strokeWidth={2} />
                        Reddet
                      </button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
          {need.responses.length === 0 && (
            <p className="text-sm text-slate-600 dark:text-slate-400">Henüz teklif yok.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
