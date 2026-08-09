"use client";

import { use, useActionState } from "react";
import { HelpCircle, Send } from "lucide-react";
import { createNeedAction } from "@/app/actions/needs";

export default function NewNeedPage(props: PageProps<"/groups/[id]/needs/new">) {
  const { id } = use(props.params);
  const action = createNeedAction.bind(null, id);
  const [state, formAction, pending] = useActionState(action, undefined);
  const inputClass =
    "w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <HelpCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Yeni İhtiyaç Bildir
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Elinizde olmayan ürünü bildirin, grup üyeleri size teklif versin.
      </p>

      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <div>
          <label className={labelClass}>Başlık</label>
          <input name="title" required className={inputClass} placeholder="Acil ihtiyaç" />
        </div>
        <div>
          <label className={labelClass}>İlaç Adı</label>
          <input name="medicineName" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Barkod (opsiyonel)</label>
          <input name="barkod" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>İhtiyaç Duyulan Miktar (opsiyonel)</label>
          <input type="number" min={1} name="quantity" className={inputClass} placeholder="10" />
        </div>
        <div>
          <label className={labelClass}>Açıklama (opsiyonel)</label>
          <textarea name="description" rows={3} className={inputClass} maxLength={500} />
        </div>

        {state?.error && (
          <p className="text-sm text-red-600 dark:text-red-400" aria-live="polite">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          <Send className="h-4 w-4" strokeWidth={1.75} />
          {pending ? "Yayınlanıyor..." : "İhtiyacı Bildir"}
        </button>
      </form>
    </div>
  );
}
