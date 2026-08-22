"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertTriangle, UserPlus } from "lucide-react";
import { resetDatabaseAndSeedTestAccountsAction, seedTestAccountsOnlyAction } from "@/app/actions/db-reset";

export default function DbResetPage() {
  const [resetState, resetFormAction, resetPending] = useActionState(
    resetDatabaseAndSeedTestAccountsAction,
    undefined
  );
  const [seedState, seedFormAction, seedPending] = useActionState(seedTestAccountsOnlyAction, undefined);
  const inputClass =
    "w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <section className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-emerald-700 dark:text-emerald-400">
          <UserPlus className="h-5 w-5" strokeWidth={1.75} />
          Sadece Deneme Hesapları Oluştur
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Mevcut hiçbir veriyi silmeden denemehesabi1@gmail.com – denemehesabi10@gmail.com
          (şifre: 123456) hesaplarını oluşturur/günceller.
        </p>

        <form action={seedFormAction} className="mt-4 flex flex-col gap-4">
          <div>
            <label className={labelClass}>Anahtar</label>
            <input type="password" name="secret" required className={inputClass} />
          </div>

          {seedState?.error && (
            <p className="text-sm text-red-600 dark:text-red-400" aria-live="polite">
              {seedState.error}
            </p>
          )}
          {seedState?.success && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400" aria-live="polite">
              {seedState.success}
            </p>
          )}

          <button
            type="submit"
            disabled={seedPending}
            className="flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {seedPending ? "Oluşturuluyor..." : "10 Deneme Hesabı Oluştur"}
          </button>
        </form>
      </section>

      <section className="mt-10 rounded-lg border border-red-500/30 bg-red-500/5 p-5">
        <h1 className="flex items-center gap-2 text-lg font-bold text-red-600 dark:text-red-400">
          <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
          Veritabanını Sıfırla
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Bu işlem <strong>tüm</strong> eczaneleri, grupları, ilanları, teklifleri, cari
          hareketleri, duyuruları ve ilaç veritabanını kalıcı olarak siler — geri alınamaz.
          Ardından denemehesabi1@gmail.com – denemehesabi10@gmail.com (şifre: 123456) test
          hesapları oluşturulur.
        </p>

        <form action={resetFormAction} className="mt-4 flex flex-col gap-4">
          <div>
            <label className={labelClass}>Sıfırlama Anahtarı</label>
            <input type="password" name="secret" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>
              Onaylamak için <span className="font-mono font-bold">SIFIRLA</span> yazın
            </label>
            <input name="confirmation" required className={inputClass} placeholder="SIFIRLA" />
          </div>

          {resetState?.error && (
            <p className="text-sm text-red-600 dark:text-red-400" aria-live="polite">
              {resetState.error}
            </p>
          )}
          {resetState?.success && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400" aria-live="polite">
              {resetState.success}
            </p>
          )}

          <button
            type="submit"
            disabled={resetPending}
            className="mt-2 flex items-center justify-center gap-1.5 rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-500 disabled:opacity-60"
          >
            {resetPending ? "Sıfırlanıyor..." : "Tüm Veritabanını Sil ve Test Hesapları Oluştur"}
          </button>
        </form>
      </section>

      <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
        <Link href="/login" className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
          Giriş sayfasına dön
        </Link>
      </p>
    </div>
  );
}
