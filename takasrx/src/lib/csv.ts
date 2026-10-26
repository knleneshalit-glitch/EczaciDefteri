type Cell = string | number | null | undefined;

function formatCell(value: Cell) {
  if (value == null) return "";
  const s =
    typeof value === "number"
      ? value.toLocaleString("tr-TR", { maximumFractionDigits: 2, useGrouping: false })
      : String(value);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Tabloyu Excel'in Türkçe ayarlarıyla doğrudan açabileceği bir CSV olarak
 * indirir (UTF-8 BOM, ";" ayırıcı, virgüllü ondalık).
 */
export function downloadCsv(filename: string, headers: string[], rows: Cell[][]) {
  const content = "﻿" + [headers, ...rows].map((r) => r.map(formatCell).join(";")).join("\r\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
