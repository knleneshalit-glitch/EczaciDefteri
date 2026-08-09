"use client";

import { useActionState } from "react";
import { createGroupAction } from "@/app/actions/groups";
import RegionSelect from "@/components/RegionSelect";

export default function NewGroupPage() {
  const [state, formAction, pending] = useActionState(createGroupAction, undefined);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">Yeni Grup Kur</h1>
      <p className="mt-1 text-sm text-slate-600">
        Kurduğunuz grubun yöneticisi siz olursunuz; katılım isteklerini siz onaylarsınız.
      </p>

      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Grup Adı
          </label>
          <input
            name="name"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            placeholder="Kadıköy Eczacılar Takas Grubu"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Bölge
          </label>
          <RegionSelect name="region" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Açıklama (opsiyonel)
          </label>
          <textarea
            name="description"
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-600" aria-live="polite">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Oluşturuluyor..." : "Grubu Oluştur"}
        </button>
      </form>
    </div>
  );
}
