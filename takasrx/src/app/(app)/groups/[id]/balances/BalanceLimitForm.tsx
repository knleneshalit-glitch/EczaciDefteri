"use client";

import { useActionState } from "react";
import { ShieldAlert } from "lucide-react";
import { updateBalanceLimitAction } from "@/app/actions/groups";

export default function BalanceLimitForm({
  groupId,
  enabled,
  limit,
}: {
  groupId: string;
  enabled: boolean;
  limit: number | null;
}) {
  const action = updateBalanceLimitAction.bind(null, groupId);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
    >
      <label className="flex w-full items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 sm:w-auto sm:pb-2">
        <input type="checkbox" name="balanceLimitEnabled" defaultChecked={enabled} />
        Bakiye Kısıtlaması
      </label>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Borç Limiti (₺)</label>
        <input
          type="number"
          name="balanceLimit"
          min={0}
          step="0.01"
          defaultValue={limit ?? ""}
          placeholder="5000"
          className="w-36 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        <ShieldAlert className="h-4 w-4" strokeWidth={1.75} />
        {pending ? "Kaydediliyor..." : "Kısıtlamayı Kaydet"}
      </button>
      {state?.error && (
        <p className="w-full text-sm text-red-600 dark:text-red-400" aria-live="polite">
          {state.error}
        </p>
      )}
      <p className="w-full text-xs text-slate-500">
        Açıkken, cari toplamı (bekleyen teklifleri dahil) bu borç limitinin altına düşecek üyeler
        yeni alım teklifi veremez. Örn. limit 5.000 ₺ ise bir üyenin borcu en fazla 5.000 ₺ olabilir.
      </p>
    </form>
  );
}
