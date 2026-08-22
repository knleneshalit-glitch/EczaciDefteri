"use client";

import { useActionState } from "react";
import { ClipboardList } from "lucide-react";
import { uploadShipmentBarcodesAction } from "@/app/actions/shipments";

export default function BarcodeUploadForm({
  groupId,
  listingId,
  offerId,
}: {
  groupId: string;
  listingId: string;
  offerId: string;
}) {
  const action = uploadShipmentBarcodesAction.bind(null, groupId, listingId, offerId);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6"
    >
      <div className="text-center">
        <ClipboardList className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Ürün kutularındaki karekodları aşağıya yapıştırın — her satıra bir karekod (toplu
          yapıştırabilir ya da tek tek girebilirsiniz).
        </p>
      </div>

      <textarea
        name="barcodes"
        required
        rows={6}
        placeholder={"0186994...\n0186994...\n0186994..."}
        className="mt-4 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
      />

      {state?.error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" aria-live="polite">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mx-auto mt-4 flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        {pending ? "Kaydediliyor..." : "Tamam"}
      </button>
    </form>
  );
}
