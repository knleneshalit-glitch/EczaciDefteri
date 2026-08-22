"use client";

import { useActionState } from "react";
import Link from "next/link";
import { UserPlus, Truck } from "lucide-react";
import { registerPharmacyAction } from "@/app/actions/auth";
import RegionSelect from "@/components/RegionSelect";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerPharmacyAction, undefined);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <UserPlus className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Eczane Olarak Üye Ol
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Eczanenizi kaydedin, bölgenizdeki takas grubuna katılın.
      </p>
      <Link
        href="/register/courier"
        className="mt-3 flex w-fit items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Truck className="h-3.5 w-3.5" strokeWidth={1.75} />
        Sevkiyatçı olarak kayıt olmak için tıklayın
      </Link>

      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Eczane Adı
          </label>
          <input
            name="pharmacyName"
            required
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            placeholder="Merkez Eczanesi"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Yetkili Adı Soyadı
          </label>
          <input
            name="contactName"
            required
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            placeholder="Ad Soyad"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            GLN Numarası
          </label>
          <input
            name="gln"
            required
            pattern="\d{13}"
            title="13 haneli GLN numarası"
            inputMode="numeric"
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            placeholder="8680001234567"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Bölge (İl)
            </label>
            <RegionSelect name="region" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              İlçe (opsiyonel)
            </label>
            <input
              name="district"
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              placeholder="Kadıköy"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Adres (opsiyonel)
          </label>
          <input
            name="address"
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            placeholder="Mahalle, cadde, no"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            E-posta
          </label>
          <input
            type="email"
            name="email"
            required
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            placeholder="eczane@example.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Şifre
          </label>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            placeholder="En az 8 karakter"
          />
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
          <UserPlus className="h-4 w-4" strokeWidth={1.75} />
          {pending ? "Kaydediliyor..." : "Üye Ol"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
        Zaten hesabınız var mı?{" "}
        <Link href="/login" className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
          Giriş yapın
        </Link>
      </p>
    </div>
  );
}
