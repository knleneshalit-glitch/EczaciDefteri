import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { requirePharmacy } from "@/lib/require-user";
import { getUnreadCount } from "@/lib/notifications";
import Sidebar from "@/components/Sidebar";
import SidebarShell from "@/components/SidebarShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePharmacy();
  const unreadCount = await getUnreadCount(user.id);

  return (
    <div className="min-h-screen flex-1 lg:flex">
      <SidebarShell homeHref="/dashboard" notificationsHref="/notifications" unreadCount={unreadCount}>
        <Sidebar
          user={{ pharmacyName: user.pharmacyName ?? user.contactName, email: user.email }}
          unreadCount={unreadCount}
          isSuperAdmin={user.isSuperAdmin}
        />
      </SidebarShell>
      {/* Alt boşluk: sağ alttaki Destek düğmesi son içeriğin üstüne binmesin. */}
      <div className="min-w-0 flex-1 bg-slate-50 pb-16 dark:bg-slate-950 print:pb-0">{children}</div>
      <Link
        href="/support"
        title="Destek"
        aria-label="Destek"
        className="fixed bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 sm:bottom-5 sm:right-5 print:hidden"
      >
        <LifeBuoy className="h-6 w-6" strokeWidth={1.75} />
      </Link>
    </div>
  );
}
