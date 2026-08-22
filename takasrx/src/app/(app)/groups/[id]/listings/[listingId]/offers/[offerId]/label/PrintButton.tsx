"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { markLabelPrintedAction } from "@/app/actions/shipments";

export default function PrintButton({ shipmentId }: { shipmentId: string }) {
  const [printing, setPrinting] = useState(false);

  return (
    <button
      onClick={async () => {
        setPrinting(true);
        try {
          await markLabelPrintedAction(shipmentId);
        } finally {
          setPrinting(false);
          window.print();
        }
      }}
      disabled={printing}
      className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
    >
      <Printer className="h-4 w-4" strokeWidth={1.75} />
      {printing ? "İşaretleniyor..." : "Etiketi Yazdır"}
    </button>
  );
}
