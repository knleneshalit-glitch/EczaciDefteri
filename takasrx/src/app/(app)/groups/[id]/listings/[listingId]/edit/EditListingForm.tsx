"use client";

import { useActionState, useState } from "react";
import { Pencil, Save } from "lucide-react";
import { updateListingAction } from "@/app/actions/listings";

type Defaults = {
  medicineName: string;
  barkod: string;
  quantity: string;
  description: string;
  birimFiyat: number;
  totalStock: number;
  dealBonusQuantity: number;
  ekstraIndirim?: number;
  etiketFiyati?: number;
  startDate: string;
  endDate: string;
  minAlim?: number;
  maxAlim?: number;
  expiryDate: string;
};

function effectivePricePreview(birimFiyat: number, totalStock: number, bonus: number, ekstraIndirim: number) {
  if (!birimFiyat || !totalStock) return birimFiyat || 0;
  const hasBonus = bonus > 0 && bonus < totalStock;
  const paidQuantity = hasBonus ? totalStock - bonus : totalStock;
  let totalCost = birimFiyat * paidQuantity;
  if (ekstraIndirim > 0) totalCost = Math.max(0, totalCost - ekstraIndirim);
  return totalCost / totalStock;
}

export default function EditListingForm({
  groupId,
  listingId,
  hasAcceptedOffers,
  defaults,
}: {
  groupId: string;
  listingId: string;
  hasAcceptedOffers: boolean;
  defaults: Defaults;
}) {
  const action = updateListingAction.bind(null, groupId, listingId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [medicineName, setMedicineName] = useState(defaults.medicineName);
  const [birimFiyat, setBirimFiyat] = useState(defaults.birimFiyat);
  const [totalStock, setTotalStock] = useState(defaults.totalStock);
  const [dealBonusQuantity, setDealBonusQuantity] = useState(defaults.dealBonusQuantity);
  const [ekstraIndirim, setEkstraIndirim] = useState(defaults.ekstraIndirim ?? 0);

  const netFiyat = effectivePricePreview(birimFiyat, totalStock, dealBonusQuantity, ekstraIndirim);
  const hasBonus = dealBonusQuantity > 0 && totalStock > dealBonusQuantity;
  const inputClass =
    "w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none disabled:opacity-50";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <Pencil className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        İlanı Düzenle
      </h1>

      <form action={formAction} className="mt-8 flex flex-col gap-8">
        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ürün Bilgisi</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>İlaç Adı</label>
              <input
                name="medicineName"
                required
                value={medicineName}
                onChange={(e) => setMedicineName(e.target.value.toLocaleUpperCase("tr-TR"))}
                className={`${inputClass} uppercase`}
              />
            </div>
            <div>
              <label className={labelClass}>Barkod</label>
              <input name="barkod" defaultValue={defaults.barkod} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Miktar Açıklaması (opsiyonel)</label>
              <input name="quantity" defaultValue={defaults.quantity} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Son Kullanma Tarihi</label>
              <input
                type="date"
                name="expiryDate"
                defaultValue={defaults.expiryDate}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Depo Alım Şartı</h2>
          {hasAcceptedOffers && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Bu ilana kabul edilmiş teklif olduğu için fiyat/stok bilgileri artık değiştirilemez.
            </p>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Depo Birim Fiyatı (₺)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                required={!hasAcceptedOffers}
                disabled={hasAcceptedOffers}
                name="birimFiyat"
                defaultValue={defaults.birimFiyat || ""}
                onChange={(e) => setBirimFiyat(Number(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Toplam Stok (adet)</label>
              <input
                type="number"
                min={1}
                disabled={hasAcceptedOffers}
                name="totalStock"
                defaultValue={defaults.totalStock || ""}
                onChange={(e) => setTotalStock(Number(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Bunun Kaçı Mal Fazlası</label>
              <input
                type="number"
                min={0}
                disabled={hasAcceptedOffers}
                name="dealBonusQuantity"
                defaultValue={defaults.dealBonusQuantity || ""}
                onChange={(e) => setDealBonusQuantity(Number(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClass}>Ekstra İndirim (₺, toplam tutar üzerinden, opsiyonel)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              name="ekstraIndirim"
              defaultValue={defaults.ekstraIndirim ?? ""}
              onChange={(e) => setEkstraIndirim(Number(e.target.value) || 0)}
              className={`${inputClass} max-w-xs`}
            />
            <p className="mt-1 text-xs text-slate-500">
              Firma faturaya yansımayan ekstra bir indirim yaptıysa, toplam tutarı buraya girin;
              tüm adede bölünüp efektif birim fiyata otomatik yansıtılır.
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">Grubun alacağı efektif birim fiyat</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {netFiyat.toFixed(2)} ₺
            </p>
            {hasBonus && birimFiyat > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                {birimFiyat.toFixed(2)} ₺ yerine, {dealBonusQuantity} adet mal fazlası sayesinde
                bu fiyattan satış yapabilirsiniz.
              </p>
            )}
            {ekstraIndirim > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                Ayrıca {ekstraIndirim.toFixed(2)} ₺ ekstra indirim tüm adede yansıtıldı.
              </p>
            )}
          </div>

          <div className="mt-4">
            <label className={labelClass}>Etiket Fiyatı (₺, opsiyonel)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              name="etiketFiyati"
              defaultValue={defaults.etiketFiyati ?? ""}
              className={`${inputClass} max-w-xs`}
            />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Yayın ve Alım Koşulları
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>Başlangıç</label>
              <input
                type="date"
                name="startDate"
                defaultValue={defaults.startDate}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Bitiş</label>
              <input
                type="date"
                name="endDate"
                defaultValue={defaults.endDate}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Kişi Başı Minimum</label>
              <input
                type="number"
                min={1}
                name="minAlim"
                defaultValue={defaults.minAlim ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Kişi Başı Maksimum</label>
              <input
                type="number"
                min={0}
                name="maxAlim"
                defaultValue={defaults.maxAlim ?? ""}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <label className={labelClass}>Teklif Açıklaması</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={defaults.description}
            maxLength={500}
            className={inputClass}
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
          <Save className="h-4 w-4" strokeWidth={1.75} />
          {pending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </button>
      </form>
    </div>
  );
}
