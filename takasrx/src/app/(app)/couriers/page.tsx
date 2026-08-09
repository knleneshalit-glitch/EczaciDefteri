import { Truck, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePharmacy } from "@/lib/require-user";
import { assignCourierAction, removeCourierAssignmentAction } from "@/app/actions/couriers";
import AssignCourierForm from "./AssignCourierForm";

export default async function CouriersPage() {
  const pharmacy = await requirePharmacy();

  const assignments = await prisma.courierAssignment.findMany({
    where: { pharmacyId: pharmacy.id },
    include: { courier: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <Truck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Sevkiyatçılarım
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Buraya eklediğiniz sevkiyatçılar, eczanenize ait sevkiyatları kendi ekranlarında görüp
        teslim alabilir.
      </p>

      <AssignCourierForm action={assignCourierAction} />

      <ul className="mt-6 flex flex-col gap-2">
        {assignments.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {a.courier.contactName}
              </p>
              <p className="text-xs text-slate-500">{a.courier.email}</p>
            </div>
            <form action={removeCourierAssignmentAction.bind(null, a.id)}>
              <button className="flex items-center gap-1 rounded-md border border-red-500/40 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400">
                <X className="h-3.5 w-3.5" strokeWidth={2} />
                Kaldır
              </button>
            </form>
          </li>
        ))}
        {assignments.length === 0 && (
          <p className="text-sm text-slate-500">Henüz sevkiyatçı eklemediniz.</p>
        )}
      </ul>
    </div>
  );
}
