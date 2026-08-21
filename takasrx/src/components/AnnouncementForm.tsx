"use client";

import { useActionState } from "react";
import { Megaphone } from "lucide-react";
import { createAnnouncementAction } from "@/app/actions/announcements";

export default function AnnouncementForm() {
  const [state, formAction, pending] = useActionState(createAnnouncementAction, undefined);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Başlık</label>
        <input
          name="title"
          required
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          placeholder="Bakım duyurusu"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Duyuru Metni</label>
        <textarea
          name="body"
          required
          rows={3}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          placeholder="Tüm kullanıcılara duyurulacak metin"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400" aria-live="polite">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex w-fit items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        <Megaphone className="h-4 w-4" strokeWidth={1.75} />
        {pending ? "Yayınlanıyor..." : "Duyuruyu Yayınla"}
      </button>
    </form>
  );
}
