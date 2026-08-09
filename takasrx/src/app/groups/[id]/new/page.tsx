"use client";

import { use, useActionState } from "react";
import { createListingAction } from "@/app/actions/listings";

export default function NewListingPage(props: PageProps<"/groups/[id]/new">) {
  const { id } = use(props.params);
  const action = createListingAction.bind(null, id);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">Yeni Takas İlanı</h1>

      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Başlık</label>
          <input
            name="title"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            placeholder="Fazla stok - takasa açık"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">İlaç Adı</label>
          <input
            name="medicineName"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Miktar</label>
            <input
              name="quantity"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              placeholder="10 kutu"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Son Kullanma Tarihi
            </label>
            <input
              type="date"
              name="expiryDate"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Açıklama (opsiyonel)
          </label>
          <textarea
            name="description"
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            placeholder="Karşılığında ne aradığınızı yazabilirsiniz."
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
          {pending ? "Yayınlanıyor..." : "İlanı Yayınla"}
        </button>
      </form>
    </div>
  );
}
