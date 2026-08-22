import Link from "next/link";
import { ArrowLeftRight, Truck, Bell, LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import ThemeToggle from "@/components/ThemeToggle";
import PaletteSelector from "@/components/PaletteSelector";

export default function CourierSidebar({
  user,
  unreadCount = 0,
}: {
  user: { contactName: string; email: string };
  unreadCount?: number;
}) {
  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 print:hidden">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <Link
            href="/courier/dashboard"
            className="flex items-center gap-2 text-lg font-bold text-emerald-600 dark:text-emerald-400"
          >
            <ArrowLeftRight className="h-5 w-5" strokeWidth={2.5} />
            TakasRX
          </Link>
          <Link
            href="/courier/notifications"
            className="relative text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <Bell className="h-5 w-5" strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        </div>
        <p className="mt-1 text-xs text-slate-500">Sevkiyatçı Paneli</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <Link
          href="/courier/dashboard"
          className="flex items-center gap-3 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <Truck className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
          <span>Sevkiyatlarım</span>
        </Link>
      </nav>

      <div className="border-t border-slate-200 px-5 py-4 text-sm dark:border-slate-800">
        <ThemeToggle className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800" />
        <PaletteSelector className="mb-3" />
        <p className="truncate font-medium text-slate-900 dark:text-slate-100">
          {user.contactName}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
        <form action={logoutAction} className="mt-2">
          <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            Çıkış Yap
          </button>
        </form>
      </div>
    </div>
  );
}
