"use client";

import { useActionState } from "react";
import { Percent } from "lucide-react";
import { updateInterestRateAction } from "@/app/actions/groups";

export default function InterestRateForm({
  groupId,
  currentRate,
}: {
  groupId: string;
  currentRate: number;
}) {
  const action = updateInterestRateAction.bind(null, groupId);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Günlük Faiz Oranı (%)
        </label>
        <input
          type="number"
          name="ratePercent"
          min={0}
          max={100}
          step="0.01"
          defaultValue={(currentRate * 100).toFixed(3).replace(/\.?0+$/, "") || "0"}
          className="w-32 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        <Percent className="h-4 w-4" strokeWidth={1.75} />
        {pending ? "Kaydediliyor..." : "Oranı Güncelle"}
      </button>
      {state?.error && (
        <p className="w-full text-sm text-red-600 dark:text-red-400" aria-live="polite">
          {state.error}
        </p>
      )}
    </form>
  );
}
