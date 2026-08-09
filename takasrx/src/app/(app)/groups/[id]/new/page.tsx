"use client";

import { use, useActionState, useState } from "react";
import { PackagePlus, Send } from "lucide-react";
import { createListingAction } from "@/app/actions/listings";

function effectivePricePreview(birimFiyat: number, totalStock: number, bonus: number) {
  if (!birimFiyat || !totalStock || !bonus || bonus <= 0 || bonus >= totalStock) {
    return birimFiyat || 0;
  }
  const paidQuantity = totalStock - bonus;
  return (birimFiyat * paidQuantity) / totalStock;
}

export default function NewListingPage(props: PageProps<"/groups/[id]/new">) {
  const { id } = use(props.params);
  const action = createListingAction.bind(null, id);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [birimFiyat, setBirimFiyat] = useState(0);
  const [totalStock, setTotalStock] = useState(0);
  const [dealBonusQuantity, setDealBonusQuantity] = useState(0);

  const netFiyat = effectivePricePreview(birimFiyat, totalStock, dealBonusQuantity);
  const hasBonus = dealBonusQuantity > 0 && totalStock > dealBonusQuantity;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <PackagePlus className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Yeni Talep / Teklif Oluştur
      </h1>

      <form action={formAction} className="mt-8 flex flex-col gap-8">
        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ürün Bilgisi</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Başlık</label>
              <input
                name="title"
                required
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="Fazla stok - satışa açık"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">İlaç Adı</label>
              <input
                name="medicineName"
                required
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Barkod</label>
              <input
                name="barkod"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Miktar Açıklaması (opsiyonel)
              </label>
              <input
                name="quantity"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="10 kutu"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Son Kullanma Tarihi
              </label>
              <input
                type="date"
                name="expiryDate"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Depo Alım Şartı</h2>
          <p className="mt-1 text-xs text-slate-500">
            Depodan aldığınız toplu alım şartını girin (ör. 1000 adet parayla alıp 500 adet
            mal fazlası kazandıysanız: birim fiyat, toplam stok 1500, mal fazlası 500). Sistem,
            bu mal fazlası sayesindeki gerçek (efektif) birim maliyeti hesaplayıp grup
            üyelerine o fiyattan satış yapmanızı sağlar.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Depo Birim Fiyatı (₺)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                name="birimFiyat"
                onChange={(e) => setBirimFiyat(Number(e.target.value) || 0)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Toplam Stok (adet)
              </label>
              <input
                type="number"
                min={1}
                name="totalStock"
                onChange={(e) => setTotalStock(Number(e.target.value) || 0)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="1500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Bunun Kaçı Mal Fazlası
              </label>
              <input
                type="number"
                min={0}
                name="dealBonusQuantity"
                onChange={(e) => setDealBonusQuantity(Number(e.target.value) || 0)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="500"
              />
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">Grubun alacağı efektif birim fiyat</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{netFiyat.toFixed(2)} ₺</p>
            {hasBonus && birimFiyat > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                {birimFiyat.toFixed(2)} ₺ yerine, {dealBonusQuantity} adet mal fazlası sayesinde
                bu fiyattan satış yapabilirsiniz.
              </p>
            )}
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Etiket Fiyatı (₺, opsiyonel)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              name="etiketFiyati"
              className="w-full max-w-xs rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Yayın ve Alım Koşulları</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Başlangıç</label>
              <input
                type="date"
                name="startDate"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Bitiş</label>
              <input
                type="date"
                name="endDate"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Kişi Başı Minimum
              </label>
              <input
                type="number"
                min={1}
                name="minAlim"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="1"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Kişi Başı Maksimum
              </label>
              <input
                type="number"
                min={0}
                name="maxAlim"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Teklif Açıklaması
          </label>
          <textarea
            name="description"
            rows={3}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            placeholder="En fazla 100 karakter"
            maxLength={500}
          />
        </section>

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
          {pending ? "Yayınlanıyor..." : "Teklifi Yayınla"}
        </button>
      </form>
    </div>
  );
}
