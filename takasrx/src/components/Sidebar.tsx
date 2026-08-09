import Link from "next/link";
import {
  ArrowLeftRight,
  LayoutDashboard,
  Users,
  ClipboardList,
  Inbox,
  Send,
  Wallet,
  LogOut,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Ana Sayfa", Icon: LayoutDashboard },
  { href: "/groups", label: "Gruplarım", Icon: Users },
  { href: "/listings", label: "Talep Oluştur - Yönet", Icon: ClipboardList },
  { href: "/offers/received", label: "Gelen Teklifler", Icon: Inbox },
  { href: "/offers/sent", label: "Gönderdiğim Teklifler", Icon: Send },
  { href: "/ledger", label: "Cari Hareketler", Icon: Wallet },
];

export default function Sidebar({
  user,
}: {
  user: { pharmacyName: string; email: string };
}) {
  return (
    <div className="flex h-full w-64 shrink-0 flex-col bg-slate-900 text-slate-200">
      <div className="border-b border-slate-800 px-5 py-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-bold text-emerald-400"
        >
          <ArrowLeftRight className="h-5 w-5" strokeWidth={2.5} />
          TakasRX
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_ITEMS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-5 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Icon className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.75} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4 text-sm">
        <p className="truncate font-medium text-slate-100">{user.pharmacyName}</p>
        <p className="truncate text-xs text-slate-400">{user.email}</p>
        <form action={logoutAction} className="mt-2">
          <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            Çıkış Yap
          </button>
        </form>
      </div>
    </div>
  );
}
