"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { resetDatabaseAndSeedTestAccountsAction } from "@/app/actions/db-reset";

export default function DbResetPage() {
  const [state, formAction, pending] = useActionState(resetDatabaseAndSeedTestAccountsAction, undefined);
  const inputClass =
    "w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-red-600 dark:text-red-400">
        <AlertTriangle className="h-6 w-6" strokeWidth={1.75} />
        Veritabanını Sıfırla
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Bu işlem <strong>tüm</strong> eczaneleri, grupları, ilanları, teklifleri, cari
        hareketleri, duyuruları ve ilaç veritabanını kalıcı olarak siler — geri alınamaz.
        Ardından denemehesabi1@gmail.com – denemehesabi10@gmail.com (şifre: 123456) test
        hesapları oluşturulur.
      </p>

      <form action={formAction} className="mt-8 flex flex-col gap-4">
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

        {state?.error && (
          <p className="text-sm text-red-600 dark:text-red-400" aria-live="polite">
            {state.error}
          </p>
        )}
        {state?.success && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400" aria-live="polite">
            {state.success}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 flex items-center justify-center gap-1.5 rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-500 disabled:opacity-60"
        >
          {pending ? "Sıfırlanıyor..." : "Tüm Veritabanını Sil ve Test Hesapları Oluştur"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
        <Link href="/login" className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
          Giriş sayfasına dön
        </Link>
      </p>
    </div>
  );
}
