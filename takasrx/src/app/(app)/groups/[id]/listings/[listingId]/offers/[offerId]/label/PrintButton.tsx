"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
    >
      <Printer className="h-4 w-4" strokeWidth={1.75} />
      Etiketi Yazdır
    </button>
  );
}
