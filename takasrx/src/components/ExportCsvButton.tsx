"use client";

import { FileSpreadsheet } from "lucide-react";
import { downloadCsv } from "@/lib/csv";

type Cell = string | number | null;

/** Sunucuda hazırlanan tablo satırlarını Excel'de açılabilen CSV olarak indirir. */
export default function ExportCsvButton({
  filename,
  headers,
  rows,
}: {
  filename: string;
  headers: string[];
  rows: Cell[][];
}) {
  return (
    <button
      type="button"
      onClick={() => downloadCsv(`${filename}-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)}
      disabled={rows.length === 0}
      className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
    >
      <FileSpreadsheet className="h-4 w-4" strokeWidth={1.75} />
      Excel
    </button>
  );
}
