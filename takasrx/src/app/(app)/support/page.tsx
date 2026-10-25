import { LifeBuoy, MessageSquareReply, Clock, CheckCircle2, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { closeSupportTicketAction } from "@/app/actions/support";
import { formatTr } from "@/lib/dates";
import SupportForm from "./SupportForm";

const STATUS = {
  OPEN: { label: "Yanıt Bekliyor", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400", Icon: Clock },
  ANSWERED: { label: "Yanıtlandı", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", Icon: CheckCircle2 },
  CLOSED: { label: "Kapatıldı", className: "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400", Icon: Lock },
} as const;

export default async function SupportPage() {
  const user = await requireUser();
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <LifeBuoy className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Destek
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Takıldığınız bir konu ya da öneriniz varsa TakasRX ekibine yazın; yanıtı bildirim olarak
        alırsınız.
      </p>

      <section className="mt-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <SupportForm />
      </section>

      <h2 className="mt-8 text-sm font-semibold text-slate-900 dark:text-slate-100">Taleplerim ({tickets.length})</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {tickets.map((t) => {
          const status = STATUS[t.status];
          return (
            <li key={t.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{t.subject}</p>
                  <p className="text-xs text-slate-500">{formatTr(t.createdAt, true)}</p>
                </div>
                <span className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${status.className}`}>
                  <status.Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {status.label}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{t.body}</p>
              {t.adminReply && (
                <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <MessageSquareReply className="h-3.5 w-3.5" strokeWidth={1.75} />
                    TakasRX Ekibi · {formatTr(t.repliedAt, true)}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-800 dark:text-slate-200">{t.adminReply}</p>
                </div>
              )}
              {t.status !== "CLOSED" && (
                <form action={closeSupportTicketAction.bind(null, t.id)} className="mt-2">
                  <button className="text-xs text-slate-500 hover:underline">Talebi kapat</button>
                </form>
              )}
            </li>
          );
        })}
        {tickets.length === 0 && <p className="text-sm text-slate-500">Henüz destek talebiniz yok.</p>}
      </ul>
    </div>
  );
}
