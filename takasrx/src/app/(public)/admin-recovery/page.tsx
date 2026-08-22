"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { adminRecoveryResetAction } from "@/app/actions/auth";

export default function AdminRecoveryPage() {
  const [state, formAction, pending] = useActionState(adminRecoveryResetAction, undefined);
  const inputClass =
    "w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
        Sistem Yönetici Kurtarma
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        TakasRX Admin (SYSTEM_ADMIN_EMAIL) hesabının şifresini, Vercel&apos;de tanımlı
        ADMIN_RECOVERY_SECRET anahtarını girerek sıfırlayabilirsiniz.
      </p>

      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <div>
          <label className={labelClass}>Kurtarma Anahtarı</label>
          <input type="password" name="secret" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Yeni Şifre</label>
          <input type="password" name="password" required minLength={8} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Yeni Şifre (Tekrar)</label>
          <input type="password" name="confirmPassword" required minLength={8} className={inputClass} />
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
          className="mt-2 flex items-center justify-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-500 disabled:opacity-60"
        >
          {pending ? "Sıfırlanıyor..." : "Şifreyi Sıfırla"}
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
