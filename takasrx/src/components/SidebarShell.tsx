"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Bell, Menu, X } from "lucide-react";

/**
 * Yan menünün kabuğu. Telefonda üstte hamburger çubuğu ve soldan açılan
 * çekmece; masaüstünde (lg) ekrana sabit, daraltılabilir menü.
 */
export default function SidebarShell({
  children,
  homeHref,
  notificationsHref,
  unreadCount = 0,
}: {
  children: React.ReactNode;
  homeHref: string;
  notificationsHref: string;
  unreadCount?: number;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia("(min-width: 64rem)");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (desktop.matches) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onResize);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onResize);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/95 px-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden print:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menüyü aç"
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Menu className="h-6 w-6" strokeWidth={2} />
        </button>
        <Link href={homeHref} className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <ArrowLeftRight className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-lg font-extrabold tracking-tight text-transparent dark:from-emerald-400 dark:to-teal-300">
            TakasRX
          </span>
        </Link>
        <Link
          href={notificationsHref}
          aria-label="Bildirimler"
          className="relative ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Bell className="h-5 w-5" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      </header>

      {open && (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden print:hidden"
        />
      )}

      <aside
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
        className={`fixed inset-y-0 left-0 z-50 max-w-[85vw] transition-[transform,visibility] duration-200 ease-out lg:visible lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:max-w-none lg:translate-x-0 print:hidden ${
          open ? "visible translate-x-0 shadow-2xl" : "invisible -translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Menüyü kapat"
          className="absolute right-3 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
        {children}
      </aside>
    </>
  );
}
