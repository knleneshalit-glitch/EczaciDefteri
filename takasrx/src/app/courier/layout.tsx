import { requireCourier } from "@/lib/require-user";
import { getUnreadCount } from "@/lib/notifications";
import CourierSidebar from "@/components/CourierSidebar";

export default async function CourierLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCourier();
  const unreadCount = await getUnreadCount(user.id);

  return (
    <div className="flex min-h-screen flex-1">
      <CourierSidebar
        user={{ contactName: user.contactName, email: user.email }}
        unreadCount={unreadCount}
      />
      <div className="flex-1 overflow-x-hidden bg-slate-50 dark:bg-slate-950">{children}</div>
    </div>
  );
}
