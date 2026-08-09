import { requireUser } from "@/lib/require-user";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar user={{ pharmacyName: user.pharmacyName, email: user.email }} />
      <div className="flex-1 overflow-x-hidden bg-slate-50">{children}</div>
    </div>
  );
}
