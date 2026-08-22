"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateProfileAction } from "@/app/actions/profile";
import RegionSelect from "@/components/RegionSelect";

export default function ProfileForm({
  user,
}: {
  user: {
    accountType: "PHARMACY" | "COURIER";
    pharmacyName: string | null;
    contactName: string;
    region: string;
    district: string | null;
    address: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {user.accountType === "PHARMACY" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Eczane Adı
          </label>
          <input
            name="pharmacyName"
            required
            defaultValue={user.pharmacyName ?? ""}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Yetkili Adı Soyadı
        </label>
        <input
          name="contactName"
          required
          defaultValue={user.contactName}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Bölge (İl)
          </label>
          <RegionSelect name="region" defaultValue={user.region} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            İlçe (opsiyonel)
          </label>
          <input
            name="district"
            defaultValue={user.district ?? ""}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Adres (opsiyonel)
        </label>
        <input
          name="address"
          defaultValue={user.address ?? ""}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
        />
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
        className="flex w-fit items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        <Save className="h-4 w-4" strokeWidth={1.75} />
        {pending ? "Kaydediliyor..." : "Bilgileri Kaydet"}
      </button>
    </form>
  );
}
