import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { requirePharmacy } from "@/lib/require-user";
import { getUnreadCount } from "@/lib/notifications";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePharmacy();
  const unreadCount = await getUnreadCount(user.id);

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar
        user={{ pharmacyName: user.pharmacyName ?? user.contactName, email: user.email }}
        unreadCount={unreadCount}
        isSuperAdmin={user.isSuperAdmin}
      />
      <div className="flex-1 overflow-x-hidden bg-slate-50 dark:bg-slate-950">{children}</div>
      <Link
        href="/support"
        title="Destek"
        aria-label="Destek"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 print:hidden"
      >
        <LifeBuoy className="h-6 w-6" strokeWidth={1.75} />
      </Link>
    </div>
  );
}
