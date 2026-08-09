import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Ana Sayfa", icon: "🏠" },
  { href: "/groups", label: "Gruplarım", icon: "👥" },
  { href: "/listings", label: "Talep Oluştur - Yönet", icon: "📝" },
  { href: "/offers/received", label: "Gelen Teklifler", icon: "📥" },
  { href: "/offers/sent", label: "Gönderdiğim Teklifler", icon: "📤" },
];

export default function Sidebar({
  user,
}: {
  user: { pharmacyName: string; email: string };
}) {
  return (
    <div className="flex h-full w-64 shrink-0 flex-col bg-slate-900 text-slate-200">
      <div className="border-b border-slate-800 px-5 py-4">
        <Link href="/dashboard" className="text-lg font-bold text-emerald-400">
          TakasRX
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-5 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4 text-sm">
        <p className="truncate font-medium text-slate-100">{user.pharmacyName}</p>
        <p className="truncate text-xs text-slate-400">{user.email}</p>
        <form action={logoutAction} className="mt-2">
          <button className="text-xs text-slate-400 hover:text-white">Çıkış Yap</button>
        </form>
      </div>
    </div>
  );
}
