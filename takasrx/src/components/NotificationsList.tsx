import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BellOff,
  Send,
  CheckCircle2,
  XCircle,
  Truck,
  Users,
  Megaphone,
  ArrowRightLeft,
  ChevronRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { markAllNotificationsReadAction } from "@/app/actions/notifications";

function iconForMessage(message: string): { Icon: LucideIcon; color: string } {
  if (message.includes("kabul edildi")) return { Icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" };
  if (message.includes("reddedildi")) return { Icon: XCircle, color: "text-red-600 dark:text-red-400" };
  if (message.includes("sevkiyat") || message.includes("teslim")) return { Icon: Truck, color: "text-orange-600 dark:text-orange-400" };
  if (message.includes("stoğa dönüştü") || message.includes("dönüştür")) return { Icon: ArrowRightLeft, color: "text-violet-600 dark:text-violet-400" };
  if (message.includes("katılma") || message.includes("üye")) return { Icon: Users, color: "text-blue-600 dark:text-blue-400" };
  if (message.includes("duyuru")) return { Icon: Megaphone, color: "text-amber-600 dark:text-amber-400" };
  if (message.includes("almak istiyor") || message.includes("teklif")) return { Icon: Send, color: "text-indigo-600 dark:text-indigo-400" };
  return { Icon: Bell, color: "text-slate-500 dark:text-slate-400" };
}

function relativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "az önce";
  if (minutes < 60) return `${minutes} dakika önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return date.toLocaleDateString("tr-TR");
}

function dayLabel(date: Date) {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (diffDays === 0) return "Bugün";
  if (diffDays === 1) return "Dün";
  if (diffDays < 7) return "Bu Hafta";
  return "Daha Önce";
}

export default async function NotificationsList({ userId }: { userId: string }) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  await markAllNotificationsReadAction();

  const groups: { label: string; items: typeof notifications }[] = [];
  for (const n of notifications) {
    const label = dayLabel(n.createdAt);
    const existing = groups.find((g) => g.label === label);
    if (existing) existing.items.push(n);
    else groups.push({ label, items: [n] });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <Bell className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Bildirimler
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Grup, teklif ve sevkiyat hareketleriyle ilgili son bildirimleriniz.
      </p>

      {notifications.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center">
          <BellOff className="h-10 w-10 text-slate-400" strokeWidth={1.5} />
          <p className="text-sm text-slate-500">Henüz bildiriminiz yok.</p>
          <p className="max-w-xs text-xs text-slate-400">
            Gruplarınızda teklif, sevkiyat veya üyelik hareketleri olduğunda burada görünecek.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {group.label}
              </h2>
              <ul className="flex flex-col gap-2">
                {group.items.map((n) => {
                  const { Icon, color } = iconForMessage(n.message);
                  const content = (
                    <>
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 ${color}`}>
                        <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-800 dark:text-slate-200">{n.message}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{relativeTime(n.createdAt)}</p>
                      </div>
                      {n.link && (
                        <ChevronRight className="h-4 w-4 shrink-0 self-center text-slate-400" strokeWidth={1.75} />
                      )}
                    </>
                  );
                  const itemClass = `flex items-start gap-3 rounded-lg border p-3 transition ${
                    !n.read
                      ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-500/5"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  }`;
                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link href={n.link} className={`${itemClass} hover:border-emerald-400 hover:shadow-sm`}>
                          {content}
                        </Link>
                      ) : (
                        <div className={itemClass}>{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
