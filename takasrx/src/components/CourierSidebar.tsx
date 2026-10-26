import Link from "next/link";
import { ArrowLeftRight, Truck, Bell, LogOut, Route, History, Search, UserCog } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import ThemeToggle from "@/components/ThemeToggle";
import PaletteSelector from "@/components/PaletteSelector";
import NavLink from "@/components/NavLink";
import SidebarCollapseButton from "@/components/SidebarCollapseButton";
import { NAV_ICON_CLASS, NAV_LINK_CLASS, SIDEBAR_CLASS } from "@/components/Sidebar";

const COURIER_NAV = [
  { href: "/courier/dashboard", label: "Bugünün Rotası", Icon: Route },
  { href: "/courier/dashboard?tab=aktif", label: "Aktif Sevkiyatlarım", Icon: Truck },
  { href: "/courier/dashboard?tab=gecmis", label: "Geçmiş Rotalar", Icon: History },
  { href: "/courier/dashboard?tab=ara", label: "Sevkiyatta Ürün Arama", Icon: Search },
  { href: "/courier/profile", label: "Hesap Ayarları", Icon: UserCog },
];

export default function CourierSidebar({
  user,
  unreadCount = 0,
}: {
  user: { contactName: string; email: string };
  unreadCount?: number;
}) {
  return (
    <div className={SIDEBAR_CLASS}>
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 lg:sidebar-collapsed:px-0">
        <div className="flex items-center justify-between lg:sidebar-collapsed:flex-col lg:sidebar-collapsed:gap-3">
          <Link
            href="/courier/dashboard"
            title="Bugünün Rotası"
            className="flex items-center gap-2 text-lg font-bold text-emerald-600 dark:text-emerald-400"
          >
            <ArrowLeftRight className="h-5 w-5" strokeWidth={2.5} />
            <span className="lg:sidebar-collapsed:hidden">TakasRX</span>
          </Link>
          <Link
            href="/courier/notifications"
            title="Bildirimler"
            aria-label="Bildirimler"
            className="relative hidden text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white lg:block"
          >
            <Bell className="h-5 w-5" strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        </div>
        <p className="mt-1 text-xs text-slate-500 lg:sidebar-collapsed:hidden">Sevkiyatçı Paneli</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {COURIER_NAV.map(({ href, label, Icon }) => (
          <NavLink
            key={href}
            href={href}
            title={label}
            matchTab={href.startsWith("/courier/dashboard")}
            className={NAV_LINK_CLASS}
          >
            <Icon className={NAV_ICON_CLASS} strokeWidth={1.75} />
            <span className="lg:sidebar-collapsed:hidden">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 px-5 py-4 text-sm dark:border-slate-800 lg:sidebar-collapsed:px-3">
        <SidebarCollapseButton />
        <ThemeToggle
          labelClassName="lg:sidebar-collapsed:hidden"
          className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 lg:sidebar-collapsed:px-0"
        />
        <PaletteSelector className="mb-3 lg:sidebar-collapsed:hidden" />
        <div className="lg:sidebar-collapsed:hidden">
          <p className="truncate font-medium text-slate-900 dark:text-slate-100">
            {user.contactName}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
        </div>
        <form action={logoutAction} className="mt-2">
          <button
            title="Çıkış Yap"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white lg:sidebar-collapsed:w-full lg:sidebar-collapsed:justify-center"
          >
            <LogOut className="h-3.5 w-3.5 lg:sidebar-collapsed:h-4 lg:sidebar-collapsed:w-4" strokeWidth={1.75} />
            <span className="lg:sidebar-collapsed:hidden">Çıkış Yap</span>
          </button>
        </form>
      </div>
    </div>
  );
}
