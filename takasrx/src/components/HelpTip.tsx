"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Kartların köşesindeki "?" yardımı. Fareyle üzerine gelince `title` gösterir;
 * dokunmatik ekranda dokununca açıklama kartın altında açılır. En yakın
 * `relative` ataya göre konumlanır.
 */
export default function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        title={text}
        aria-label="Açıklama"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="absolute right-2 top-2 flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-red-400 text-[10px] font-bold text-red-500"
      >
        ?
      </button>
      {open && (
        <p
          role="tooltip"
          className="absolute inset-x-0 top-full z-20 mt-1 rounded-lg bg-slate-900 p-2.5 text-[11px] leading-snug text-white shadow-xl dark:bg-slate-700"
        >
          {text}
        </p>
      )}
    </>
  );
}
