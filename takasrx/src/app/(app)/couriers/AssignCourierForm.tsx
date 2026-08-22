"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import type { CourierAssignState } from "@/app/actions/couriers";

export default function AssignCourierForm({
  action,
}: {
  action: (state: CourierAssignState, formData: FormData) => Promise<CourierAssignState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="mt-6">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Sevkiyatçı E-postası
          </label>
          <input
            type="email"
            name="courierEmail"
            required
            className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100"
            placeholder="sevkiyatci@example.com"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          <UserPlus className="h-4 w-4" strokeWidth={1.75} />
          Ekle
        </button>
      </div>
      {state?.error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" aria-live="polite">
          {state.error}
        </p>
      )}
    </form>
  );
}
