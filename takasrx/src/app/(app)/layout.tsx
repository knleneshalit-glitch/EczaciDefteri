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
    </div>
  );
}
