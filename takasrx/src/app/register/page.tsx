"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import RegionSelect from "@/components/RegionSelect";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, undefined);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">Üye Ol</h1>
      <p className="mt-1 text-sm text-slate-600">
        Eczanenizi kaydedin, bölgenizdeki takas grubuna katılın.
      </p>

      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Eczane Adı
          </label>
          <input
            name="pharmacyName"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            placeholder="Merkez Eczanesi"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Bölge
          </label>
          <RegionSelect name="region" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            E-posta
          </label>
          <input
            type="email"
            name="email"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            placeholder="eczane@example.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Şifre
          </label>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            placeholder="En az 8 karakter"
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
          {pending ? "Kaydediliyor..." : "Üye Ol"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Zaten hesabınız var mı?{" "}
        <Link href="/login" className="font-medium text-emerald-700 hover:underline">
          Giriş yapın
        </Link>
      </p>
    </div>
  );
}
