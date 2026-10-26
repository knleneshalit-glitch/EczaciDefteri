"use client";

import { useActionState, useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";
import { submitMedicineImageAction } from "@/app/actions/medicine-images";

const MAX_DIMENSION = 640;

function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Görsel yüklenemedi."));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas desteklenmiyor."));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function MedicineImageUpload({ barkod }: { barkod: string }) {
  const action = submitMedicineImageAction.bind(null, barkod);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [dataUrl, setDataUrl] = useState("");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | null) {
    if (!file) return;
    setError("");
    try {
      const resized = await resizeToDataUrl(file);
      setDataUrl(resized);
      setPreview(resized);
    } catch {
      setError("Fotoğraf işlenemedi. Başka bir dosya deneyin.");
    }
  }

  return (
    <form action={formAction} className="mt-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <input type="hidden" name="dataUrl" value={dataUrl} />
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
        <Camera className="h-3.5 w-3.5" strokeWidth={1.75} />
        Ürün Fotoğrafı Ekle
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">
        Yüklediğiniz fotoğraf TakasRX admin onayından sonra herkese görünür olur.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Önizleme" className="h-16 w-16 rounded-md object-cover" />
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          className="text-xs text-slate-600 dark:text-slate-400 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:px-2 file:py-1 file:text-xs"
        />
        <button
          type="submit"
          disabled={pending || !dataUrl}
          className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
          {pending ? "Gönderiliyor..." : "Gönder"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {state?.error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.error}</p>}
      {state?.success && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{state.success}</p>}
    </form>
  );
}
