"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";

const PALETTES = [
  { id: "emerald", label: "Zümrüt", swatch: "#009767" },
  { id: "ocean", label: "Okyanus", swatch: "#155dfc" },
  { id: "violet", label: "Mor", swatch: "#7f22fe" },
  { id: "sunset", label: "Gün Batımı", swatch: "#dd7400" },
  { id: "rose", label: "Gül", swatch: "#e11d48" },
] as const;

export default function PaletteSelector({ className }: { className?: string }) {
  const [palette, setPalette] = useState<string | null>(null);

  useEffect(() => {
    setPalette(document.documentElement.getAttribute("data-palette") ?? "emerald");
  }, []);

  function choose(id: string) {
    if (id === "emerald") {
      document.documentElement.removeAttribute("data-palette");
    } else {
      document.documentElement.setAttribute("data-palette", id);
    }
    localStorage.setItem("palette", id);
    setPalette(id);
  }

  return (
    <div className={className ?? "mb-3"}>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Palette className="h-3.5 w-3.5" strokeWidth={1.75} />
        Renk Paleti
      </p>
      <div className="flex items-center gap-2">
        {PALETTES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => choose(p.id)}
            title={p.label}
            aria-label={p.label}
            className={`h-6 w-6 shrink-0 rounded-full border-2 transition ${
              palette === p.id
                ? "border-slate-900 dark:border-white scale-110"
                : "border-transparent hover:scale-105"
            }`}
            style={{ backgroundColor: p.swatch }}
          />
        ))}
      </div>
    </div>
  );
}
