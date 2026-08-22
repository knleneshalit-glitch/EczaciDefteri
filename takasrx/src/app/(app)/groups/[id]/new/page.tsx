"use client";

import { use, useActionState, useEffect, useState } from "react";
import { PackagePlus, Send, History, Copy } from "lucide-react";
import { createListingAction } from "@/app/actions/listings";
import {
  searchMedicinesByNameAction,
  lookupMedicineByBarcodeAction,
  previousGroupListingsAction,
} from "@/app/actions/medicines";

type MedicineMatch = { id: string; barkod: string; name: string };
type PreviousListing = {
  id: string;
  medicineName: string;
  barkod: string | null;
  quantity: string | null;
  birimFiyat: number | null;
  totalStock: number | null;
  dealBonusQuantity: number | null;
  ekstraIndirim: number | null;
  ekstraIskontoYuzde: number | null;
  etiketFiyati: number | null;
  expiryDate: Date | null;
  minAlim: number | null;
  maxAlim: number | null;
  createdAt: Date;
  user: { pharmacyName: string | null; contactName: string };
};

function effectivePricePreview(
  birimFiyat: number,
  totalStock: number,
  bonus: number,
  ekstraIndirim: number,
  ekstraIskontoYuzde: number
) {
  if (!birimFiyat || !totalStock) return birimFiyat || 0;
  const hasBonus = bonus > 0 && bonus < totalStock;
  const paidQuantity = hasBonus ? totalStock - bonus : totalStock;
  let totalCost = birimFiyat * paidQuantity;
  if (ekstraIskontoYuzde > 0) totalCost = totalCost * (1 - Math.min(ekstraIskontoYuzde, 100) / 100);
  if (ekstraIndirim > 0) totalCost = Math.max(0, totalCost - ekstraIndirim);
  return totalCost / totalStock;
}

export default function NewListingPage(props: PageProps<"/groups/[id]/new">) {
  const { id } = use(props.params);
  const action = createListingAction.bind(null, id);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [medicineName, setMedicineName] = useState("");
  const [barkod, setBarkod] = useState("");
  const [quantity, setQuantity] = useState("");
  const [birimFiyat, setBirimFiyat] = useState(0);
  const [totalStock, setTotalStock] = useState(0);
  const [dealBonusQuantity, setDealBonusQuantity] = useState(0);
  const [ekstraIndirim, setEkstraIndirim] = useState(0);
  const [ekstraIskontoYuzde, setEkstraIskontoYuzde] = useState(0);
  const [etiketFiyati, setEtiketFiyati] = useState(0);
  const [expiryDate, setExpiryDate] = useState("");
  const [minAlim, setMinAlim] = useState(0);
  const [maxAlim, setMaxAlim] = useState(0);
  const [listingKind, setListingKind] = useState<"STOK" | "DEPO_OZEL_SART">("STOK");
  const [allowExceedDemand, setAllowExceedDemand] = useState(false);

  const [suggestions, setSuggestions] = useState<MedicineMatch[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [previousListings, setPreviousListings] = useState<PreviousListing[]>([]);

  useEffect(() => {
    if (medicineName.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      searchMedicinesByNameAction(medicineName).then(setSuggestions);
    }, 300);
    return () => clearTimeout(timer);
  }, [medicineName]);

  useEffect(() => {
    if (barkod.trim().length < 6) return;
    const timer = setTimeout(() => {
      lookupMedicineByBarcodeAction(barkod).then((match) => {
        if (match && match.name !== medicineName) {
          setMedicineName(match.name);
        }
      });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barkod]);

  useEffect(() => {
    if (medicineName.trim().length < 3 && barkod.trim().length < 6) {
      setPreviousListings([]);
      return;
    }
    const timer = setTimeout(() => {
      previousGroupListingsAction(id, medicineName, barkod).then(setPreviousListings);
    }, 350);
    return () => clearTimeout(timer);
  }, [id, medicineName, barkod]);

  function applyPreviousListing(l: PreviousListing) {
    setMedicineName(l.medicineName);
    setBarkod(l.barkod ?? "");
    setQuantity(l.quantity ?? "");
    setBirimFiyat(l.birimFiyat ?? 0);
    setTotalStock(l.totalStock ?? 0);
    setDealBonusQuantity(l.dealBonusQuantity ?? 0);
    setEkstraIndirim(l.ekstraIndirim ?? 0);
    setEkstraIskontoYuzde(l.ekstraIskontoYuzde ?? 0);
    setEtiketFiyati(l.etiketFiyati ?? 0);
    setExpiryDate(l.expiryDate ? new Date(l.expiryDate).toISOString().slice(0, 10) : "");
    setMinAlim(l.minAlim ?? 0);
    setMaxAlim(l.maxAlim ?? 0);
  }

  const netFiyat = effectivePricePreview(
    birimFiyat,
    totalStock,
    dealBonusQuantity,
    ekstraIndirim,
    ekstraIskontoYuzde
  );
  const hasBonus = dealBonusQuantity > 0 && totalStock > dealBonusQuantity;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <PackagePlus className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Yeni Talep / Teklif Oluştur
      </h1>

      <form action={formAction} className="mt-8 flex flex-col gap-8">
        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">İlan Türü</h2>
          <p className="mt-1 text-xs text-slate-500">
            Elinizde hazır stok varsa &quot;Stoğumdaki Ürün&quot;ü seçin — teklif gelince hemen
            Gönderimlerim ekranınıza düşer. Henüz depodan almadığınız ama özel şart
            çıkacak bir ürün için grup içinde talep toplamak isterseniz &quot;Depo Özel
            Şartı&quot;nı seçin — teklifler siz ürünü stoğa dönüştürene kadar Gönderimlerim
            ekranına düşmez, sadece ilan içinde birikir.
          </p>
          <input type="hidden" name="listingKind" value={listingKind} />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border-2 p-3 text-sm ${
                listingKind === "STOK"
                  ? "border-emerald-500 bg-emerald-500/5"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <span className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                <input
                  type="radio"
                  checked={listingKind === "STOK"}
                  onChange={() => setListingKind("STOK")}
                />
                Stoğumdaki Ürün
              </span>
              <span className="text-xs text-slate-500">Elimde hazır stok var, hemen satabilirim.</span>
            </label>
            <label
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border-2 p-3 text-sm ${
                listingKind === "DEPO_OZEL_SART"
                  ? "border-emerald-500 bg-emerald-500/5"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <span className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                <input
                  type="radio"
                  checked={listingKind === "DEPO_OZEL_SART"}
                  onChange={() => setListingKind("DEPO_OZEL_SART")}
                />
                Depo Özel Şartı
              </span>
              <span className="text-xs text-slate-500">Henüz almadım, önce grupta talep topluyorum.</span>
            </label>
          </div>
          {listingKind === "DEPO_OZEL_SART" && (
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                name="allowExceedDemand"
                checked={allowExceedDemand}
                onChange={(e) => setAllowExceedDemand(e.target.checked)}
              />
              Talep, girdiğim toplam stok miktarını geçebilsin (işaretlenmezse talep toplam
              stoğu geçemez)
            </label>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ürün Bilgisi</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">İlaç Adı</label>
              <input
                name="medicineName"
                required
                autoComplete="off"
                value={medicineName}
                onChange={(e) => setMedicineName(e.target.value.toLocaleUpperCase("tr-TR"))}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none uppercase"
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                  {suggestions.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onMouseDown={() => {
                          setMedicineName(m.name);
                          setBarkod(m.barkod);
                          setShowSuggestions(false);
                        }}
                        className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-emerald-50 dark:hover:bg-slate-700"
                      >
                        <span className="font-medium text-slate-900 dark:text-slate-100">{m.name}</span>
                        <span className="text-xs text-slate-500">{m.barkod}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Barkod</label>
              <input
                name="barkod"
                value={barkod}
                onChange={(e) => setBarkod(e.target.value.trim())}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Miktar Açıklaması (opsiyonel)
              </label>
              <input
                name="quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
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
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {previousListings.length > 0 && (
          <section className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <History className="h-4 w-4 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
              Bu Grupta Bu Ürün İçin Önceki İlanlar
            </h2>
            <div className="mt-3 overflow-x-auto rounded-md border border-blue-500/20">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-blue-500/20 bg-blue-500/10 uppercase text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Eczane Adı</th>
                    <th className="px-3 py-2">İlaç Adı</th>
                    <th className="px-3 py-2">Birim Fiyat</th>
                    <th className="px-3 py-2">Mal Fazlası</th>
                    <th className="px-3 py-2">İskonto</th>
                    <th className="px-3 py-2">İndirim</th>
                    <th className="px-3 py-2">Tarih</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {previousListings.map((l) => (
                    <tr key={l.id} className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 last:border-0">
                      <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                        {l.user.pharmacyName ?? l.user.contactName}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{l.medicineName}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                        {l.birimFiyat != null ? `${l.birimFiyat.toFixed(2)} ₺` : "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                        {l.totalStock != null && l.dealBonusQuantity
                          ? `${l.totalStock - l.dealBonusQuantity}+${l.dealBonusQuantity}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                        {l.ekstraIskontoYuzde != null && l.ekstraIskontoYuzde > 0 ? `%${l.ekstraIskontoYuzde}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                        {l.ekstraIndirim != null && l.ekstraIndirim > 0 ? `${l.ekstraIndirim.toFixed(0)} ₺` : "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-400">{new Date(l.createdAt).toLocaleDateString("tr-TR")}</td>
                      <td className="px-3 py-2 pr-4">
                        <button
                          type="button"
                          onClick={() => applyPreviousListing(l)}
                          className="flex w-fit items-center gap-1 whitespace-nowrap rounded-full border border-emerald-500/40 px-2.5 py-1 font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <Copy className="h-3 w-3" strokeWidth={1.75} />
                          İlanı Kullan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

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
                value={birimFiyat || ""}
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
                value={totalStock || ""}
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
                value={dealBonusQuantity || ""}
                onChange={(e) => setDealBonusQuantity(Number(e.target.value) || 0)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="500"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Ekstra İskonto (%, kampanya, opsiyonel)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                name="ekstraIskontoYuzde"
                value={ekstraIskontoYuzde || ""}
                onChange={(e) => setEkstraIskontoYuzde(Number(e.target.value) || 0)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="3"
              />
              <p className="mt-1 text-xs text-slate-500">
                Depo kampanya ile toplam tutara ek bir yüzde iskonto uyguladıysa (ör. %3), buraya
                girin.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Ekstra İndirim (₺, toplam tutar üzerinden, opsiyonel)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                name="ekstraIndirim"
                value={ekstraIndirim || ""}
                onChange={(e) => setEkstraIndirim(Number(e.target.value) || 0)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="1000"
              />
              <p className="mt-1 text-xs text-slate-500">
                Firma faturaya yansımayan sabit bir nakit indirim de yaptıysa (ör. elden 1000 ₺),
                buraya toplam tutarı girin.
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Her iki indirim de toplam tutar üzerinden hesaplanıp tüm adede bölünerek efektif
            birim fiyata otomatik yansıtılır.
          </p>

          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">Grubun alacağı efektif birim fiyat</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{netFiyat.toFixed(2)} ₺</p>
            {hasBonus && birimFiyat > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                {birimFiyat.toFixed(2)} ₺ yerine, {dealBonusQuantity} adet mal fazlası sayesinde
                bu fiyattan satış yapabilirsiniz.
              </p>
            )}
            {ekstraIskontoYuzde > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                Ayrıca %{ekstraIskontoYuzde} kampanya iskontosu tüm adede yansıtıldı.
              </p>
            )}
            {ekstraIndirim > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                Ayrıca {ekstraIndirim.toFixed(2)} ₺ ekstra indirim tüm adede yansıtıldı.
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
              value={etiketFiyati || ""}
              onChange={(e) => setEtiketFiyati(Number(e.target.value) || 0)}
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
                value={minAlim || ""}
                onChange={(e) => setMinAlim(Number(e.target.value) || 0)}
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
                value={maxAlim || ""}
                onChange={(e) => setMaxAlim(Number(e.target.value) || 0)}
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
