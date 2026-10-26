"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { createSupportTicketAction } from "@/app/actions/support";

export default function SupportForm() {
  const [state, formAction, pending] = useActionState(createSupportTicketAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Konu</label>
        <input
          name="subject"
          required
          maxLength={120}
          placeholder="Ör. Sevkiyat etiketini yazdıramıyorum"
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Mesajınız</label>
        <textarea
          name="body"
          required
          rows={5}
          maxLength={3000}
          placeholder="Sorunu ya da talebinizi ayrıntılı yazın; hangi ekranda olduğunu belirtirseniz daha hızlı yardımcı oluruz."
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.success}</p>}
      <button
        type="submit"
        disabled={pending}
        className="flex w-fit items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        <Send className="h-4 w-4" strokeWidth={1.75} />
        {pending ? "Gönderiliyor..." : "Destek Talebi Gönder"}
      </button>
    </form>
  );
}
