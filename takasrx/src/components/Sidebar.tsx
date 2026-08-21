import Link from "next/link";
import {
  ArrowLeftRight,
  LayoutDashboard,
  Users,
  ClipboardList,
  Inbox,
  Send,
  Wallet,
  Truck,
  Bell,
  LogOut,
  ShieldCheck,
  ShoppingBag,
  UserCog,
  Landmark,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import ThemeToggle from "@/components/ThemeToggle";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Ana Sayfa", Icon: LayoutDashboard },
  { href: "/groups", label: "Gruplarım", Icon: Users },
  { href: "/market", label: "Gruptaki Aktif Teklifler", Icon: ShoppingBag },
  { href: "/listings", label: "Talep Oluştur - Yönet", Icon: ClipboardList },
  { href: "/offers/received", label: "Gönderimlerim", Icon: Inbox },
  { href: "/offers/sent", label: "Alımlarım", Icon: Send },
  { href: "/ledger", label: "Cari Hareketler", Icon: Wallet },
  { href: "/balances", label: "Grup Bakiyeleri", Icon: Landmark },
  { href: "/couriers", label: "Sevkiyatçılarım", Icon: Truck },
];

export default function Sidebar({
  user,
  unreadCount = 0,
  isSuperAdmin = false,
}: {
  user: { pharmacyName: string; email: string };
  unreadCount?: number;
  isSuperAdmin?: boolean;
}) {
  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 print:hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30">
            <ArrowLeftRight className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
            TakasRX
          </span>
        </Link>
        <Link href="/notifications" className="relative text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          <Bell className="h-5 w-5" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_ITEMS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <Icon
              className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400"
              strokeWidth={1.75}
            />
            <span>{label}</span>
          </Link>
        ))}
        {isSuperAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-5 py-2.5 text-sm text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
          >
            <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span>Admin Paneli</span>
          </Link>
        )}
      </nav>

      <div className="border-t border-slate-200 px-5 py-4 text-sm dark:border-slate-800">
        <ThemeToggle className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800" />
        <Link
          href="/profile"
          className="group -mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-900 dark:text-slate-100">
              {user.pharmacyName}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>
          <UserCog
            className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
            strokeWidth={1.75}
          />
        </Link>
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
