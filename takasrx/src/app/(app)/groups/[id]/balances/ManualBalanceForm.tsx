"use client";

import { useActionState } from "react";
import { PlusCircle } from "lucide-react";
import { addManualBalanceAction } from "@/app/actions/groups";

export default function ManualBalanceForm({
  groupId,
  members,
}: {
  groupId: string;
  members: { userId: string; pharmacyName: string }[];
}) {
  const action = addManualBalanceAction.bind(null, groupId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const inputClass =
    "rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none";

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Eczane</label>
        <select name="userId" required className={inputClass}>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.pharmacyName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Tutar (₺, eksi de girilebilir)
        </label>
        <input type="number" step="0.01" name="amount" required placeholder="500 ya da -500" className={`${inputClass} w-40`} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Not (opsiyonel)</label>
        <input name="note" placeholder="Manuel bakiye düzeltmesi" className={`${inputClass} w-56`} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        <PlusCircle className="h-4 w-4" strokeWidth={1.75} />
        {pending ? "Ekleniyor..." : "Bakiye Ekle"}
      </button>
      {state?.error && (
        <p className="w-full text-sm text-red-600 dark:text-red-400" aria-live="polite">
          {state.error}
        </p>
      )}
    </form>
  );
}
