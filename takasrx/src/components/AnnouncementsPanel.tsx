"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Megaphone, FileText } from "lucide-react";

/** Ana sayfadaki "Güncel Duyurular": her duyuru bir sekme, oklarla gezilir. */
export default function AnnouncementsPanel({
  announcements,
}: {
  announcements: { id: string; title: string; body: string; createdAt: Date }[];
}) {
  const [index, setIndex] = useState(0);
  const current = announcements[index];
  if (!current) return null;

  const go = (delta: number) => setIndex((i) => (i + delta + announcements.length) % announcements.length);

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-500/30 bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-3 text-white">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Megaphone className="h-4 w-4" strokeWidth={2} />
          Güncel Duyurular
        </h2>
        {announcements.length > 1 && (
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label="Önceki duyuru"
              onClick={() => go(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-white/15 hover:bg-white/25"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Sonraki duyuru"
              onClick={() => go(1)}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-white/15 hover:bg-white/25"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 dark:border-slate-800 p-2">
        {announcements.map((a, i) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setIndex(i)}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase ${
              i === index
                ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400"
            }`}
          >
            <FileText className="h-3 w-3" strokeWidth={2} />
            {a.title.length > 22 ? `${a.title.slice(0, 22)}…` : a.title}
          </button>
        ))}
      </div>
      <div className="p-4">
        <p className="text-base font-bold text-slate-900 dark:text-slate-100">{current.title}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{new Date(current.createdAt).toLocaleDateString("tr-TR")}</p>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">{current.body}</p>
      </div>
    </div>
  );
}
