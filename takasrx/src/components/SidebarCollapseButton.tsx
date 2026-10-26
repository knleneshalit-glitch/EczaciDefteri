"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

/** Masaüstünde yan menüyü ikon şeridine daraltır / geri genişletir; tercih hatırlanır. */
export default function SidebarCollapseButton() {
  function toggle() {
    const root = document.documentElement;
    const collapse = root.getAttribute("data-sidebar") !== "collapsed";
    if (collapse) root.setAttribute("data-sidebar", "collapsed");
    else root.removeAttribute("data-sidebar");
    try {
      localStorage.setItem("sidebar", collapse ? "collapsed" : "expanded");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title="Menüyü daralt / genişlet"
      aria-label="Menüyü daralt veya genişlet"
      className="mb-3 hidden w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 lg:flex lg:sidebar-collapsed:px-0"
    >
      <PanelLeftClose className="h-3.5 w-3.5 lg:sidebar-collapsed:hidden" strokeWidth={1.75} />
      <PanelLeftOpen className="hidden h-4 w-4 lg:sidebar-collapsed:block" strokeWidth={1.75} />
      <span className="lg:sidebar-collapsed:hidden">Menüyü Daralt</span>
    </button>
  );
}
