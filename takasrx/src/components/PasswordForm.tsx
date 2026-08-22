"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { changePasswordAction } from "@/app/actions/profile";

export default function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Mevcut Şifre
        </label>
        <input
          type="password"
          name="currentPassword"
          required
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Yeni Şifre
          </label>
          <input
            type="password"
            name="newPassword"
            required
            minLength={8}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Yeni Şifre (Tekrar)
          </label>
          <input
            type="password"
            name="confirmPassword"
            required
            minLength={8}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
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
        className="flex w-fit items-center justify-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60"
      >
        <KeyRound className="h-4 w-4" strokeWidth={1.75} />
        {pending ? "Güncelleniyor..." : "Şifreyi Değiştir"}
      </button>
    </form>
  );
}
