"use client";

import { use, useActionState, useState } from "react";
import { createListingAction } from "@/app/actions/listings";
import TierEditor from "@/components/TierEditor";

export default function NewListingPage(props: PageProps<"/groups/[id]/new">) {
  const { id } = use(props.params);
  const action = createListingAction.bind(null, id);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [birimFiyat, setBirimFiyat] = useState(0);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-100">Yeni Talep / Teklif Oluştur</h1>

      <form action={formAction} className="mt-8 flex flex-col gap-8">
        <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-100">Ürün Bilgisi</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Başlık</label>
              <input
                name="title"
                required
                className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="Fazla stok - satışa açık"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">İlaç Adı</label>
              <input
                name="medicineName"
                required
                className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Barkod</label>
              <input
                name="barkod"
                className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Toplam Stok (adet)
              </label>
              <input
                type="number"
                min={1}
                name="totalStock"
                className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="1000"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Miktar Açıklaması (opsiyonel)
              </label>
              <input
                name="quantity"
                className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="10 kutu"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Son Kullanma Tarihi
              </label>
              <input
                type="date"
                name="expiryDate"
                className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-100">Teklif Detayları</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Başlangıç</label>
              <input
                type="date"
                name="startDate"
                className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Bitiş</label>
              <input
                type="date"
                name="endDate"
                className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Etiket Fiyatı (₺)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                name="etiketFiyati"
                className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Depo (Birim) Fiyatı (₺)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                name="birimFiyat"
                onChange={(e) => setBirimFiyat(Number(e.target.value) || 0)}
                className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-100">Satış Koşulları</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Hedeflenen Alım
              </label>
              <input
                type="number"
                min={0}
                name="hedefAlim"
                className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Maksimum</label>
              <input
                type="number"
                min={0}
                name="maxAlim"
                className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Minimum</label>
              <input
                type="number"
                min={1}
                name="minAlim"
                className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="1"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Alım Katları
              </label>
              <input
                type="number"
                min={1}
                name="alimKatlari"
                className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-100">Teklif Şartları (Barem)</h2>
          <p className="mt-1 text-xs text-slate-500">
            Alım miktarına göre kademeli iskonto/mal fazlası tanımlayın.
          </p>
          <div className="mt-4">
            <TierEditor birimFiyat={birimFiyat} />
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <label className="mb-1 block text-sm font-medium text-slate-300">
            Teklif Açıklaması
          </label>
          <textarea
            name="description"
            rows={3}
            className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            placeholder="En fazla 100 karakter"
            maxLength={500}
          />
        </section>

        {state?.error && (
          <p className="text-sm text-red-400" aria-live="polite">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Yayınlanıyor..." : "Teklifi Yayınla"}
        </button>
      </form>
    </div>
  );
}
