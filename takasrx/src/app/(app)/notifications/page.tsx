import { requirePharmacy } from "@/lib/require-user";
import NotificationsList from "@/components/NotificationsList";

export default async function NotificationsPage() {
  const user = await requirePharmacy();
  return <NotificationsList userId={user.id} />;
}
