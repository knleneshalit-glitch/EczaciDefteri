import { requireCourier } from "@/lib/require-user";
import { getUnreadCount } from "@/lib/notifications";
import CourierSidebar from "@/components/CourierSidebar";
import SidebarShell from "@/components/SidebarShell";

export default async function CourierLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCourier();
  const unreadCount = await getUnreadCount(user.id);

  return (
    <div className="min-h-screen flex-1 lg:flex">
      <SidebarShell
        homeHref="/courier/dashboard"
        notificationsHref="/courier/notifications"
        unreadCount={unreadCount}
      >
        <CourierSidebar
          user={{ contactName: user.contactName, email: user.email }}
          unreadCount={unreadCount}
        />
      </SidebarShell>
      <div className="min-w-0 flex-1 bg-slate-50 dark:bg-slate-950">{children}</div>
    </div>
  );
}
