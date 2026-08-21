"use client";

import { useActionState } from "react";
import { DatabaseZap } from "lucide-react";
import { importMedicineSeedAction } from "@/app/actions/medicines";

export default function ImportMedicinesButton() {
  const [state, formAction, pending] = useActionState(importMedicineSeedAction, undefined);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="flex w-fit items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        <DatabaseZap className="h-4 w-4" strokeWidth={1.75} />
        {pending ? "İçe Aktarılıyor..." : "İlaç Veritabanını İçe Aktar / Güncelle"}
      </button>
      {state?.count != null && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {state.count} ilaç kaydı işlendi.
        </p>
      )}
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
