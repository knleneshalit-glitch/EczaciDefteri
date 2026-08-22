import { requireCourier } from "@/lib/require-user";
import NotificationsList from "@/components/NotificationsList";

export default async function CourierNotificationsPage() {
  const user = await requireCourier();
  return <NotificationsList userId={user.id} />;
}
