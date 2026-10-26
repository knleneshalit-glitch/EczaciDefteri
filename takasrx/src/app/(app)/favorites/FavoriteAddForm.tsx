"use client";

import { useActionState, useEffect, useState } from "react";
import { Star, Plus } from "lucide-react";
import { addFavoriteAction, type FavoriteState } from "@/app/actions/favorites";
import { searchMedicinesByNameAction } from "@/app/actions/medicines";

type MedicineMatch = { id: string; barkod: string; name: string };

export default function FavoriteAddForm() {
  const [name, setName] = useState("");
  const [barkod, setBarkod] = useState("");
  const [suggestions, setSuggestions] = useState<MedicineMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: FavoriteState, formData: FormData) => {
    const result = await addFavoriteAction(prev, formData);
    if (result?.success) {
      setName("");
      setBarkod("");
      setSuggestions([]);
    }
    return result;
  }, undefined);

  useEffect(() => {
    if (name.trim().length < 2) return;
    const timer = setTimeout(() => {
      searchMedicinesByNameAction(name).then(setSuggestions);
    }, 300);
    return () => clearTimeout(timer);
  }, [name]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="relative min-w-[260px] flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Ürün Adı</label>
        <input
          name="medicineName"
          required
          autoComplete="off"
          value={name}
          onChange={(e) => {
            setName(e.target.value.toLocaleUpperCase("tr-TR"));
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Ör. PAROL 500 MG 20 TABLET"
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm uppercase text-slate-900 dark:text-slate-100 placeholder:normal-case placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
        />
        {open && name.trim().length >= 2 && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
            {suggestions.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onMouseDown={() => {
                    setName(m.name);
                    setBarkod(m.barkod);
                    setOpen(false);
                  }}
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-emerald-50 dark:hover:bg-slate-700"
                >
                  <span className="font-medium text-slate-900 dark:text-slate-100">{m.name}</span>
                  <span className="text-xs text-slate-500">{m.barkod}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Barkod (opsiyonel)</label>
        <input
          name="barkod"
          value={barkod}
          onChange={(e) => setBarkod(e.target.value.trim())}
          className="w-44 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1.5 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400 disabled:opacity-60"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        <Star className="h-4 w-4" strokeWidth={2} />
        {pending ? "Ekleniyor..." : "Favorilere Ekle"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-emerald-600 dark:text-emerald-400">{state.success}</p>}
    </form>
  );
}
