"use client";

import { useActionState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { resetPasswordAction } from "@/app/actions/auth";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, undefined);
  const inputClass =
    "w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <KeyRound className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Şifremi Unuttum
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Kimliğinizi doğrulayın, yeni şifrenizi hemen belirleyin.
      </p>

      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <div>
          <label className={labelClass}>E-posta</label>
          <input type="email" name="email" required className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>GLN Numaranız (eczaneyseniz) veya Yetkili Adı Soyadı</label>
          <input name="identifier" required className={inputClass} placeholder="8680000000000 ya da Ahmet Yılmaz" />
        </div>

        <div>
          <label className={labelClass}>Yeni Şifre</label>
          <input type="password" name="password" required className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Yeni Şifre (Tekrar)</label>
          <input type="password" name="confirmPassword" required className={inputClass} />
        </div>

        {state?.error && (
          <p className="text-sm text-red-600 dark:text-red-400" aria-live="polite">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          <KeyRound className="h-4 w-4" strokeWidth={1.75} />
          {pending ? "Güncelleniyor..." : "Şifreyi Güncelle"}
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
