import Link from "next/link";
import { Bell } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { markAllNotificationsReadAction } from "@/app/actions/notifications";

export default async function NotificationsList({ userId }: { userId: string }) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  await markAllNotificationsReadAction();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <Bell className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Bildirimler
      </h1>

      <ul className="mt-6 flex flex-col gap-2">
        {notifications.map((n) => (
          <li
            key={n.id}
            className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
          >
            {n.link ? (
              <Link href={n.link} className="text-sm text-slate-800 hover:underline dark:text-slate-200">
                {n.message}
              </Link>
            ) : (
              <p className="text-sm text-slate-800 dark:text-slate-200">{n.message}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              {n.createdAt.toLocaleString("tr-TR")}
            </p>
          </li>
        ))}
        {notifications.length === 0 && (
          <p className="text-sm text-slate-500">Henüz bildiriminiz yok.</p>
        )}
      </ul>
    </div>
  );
}
