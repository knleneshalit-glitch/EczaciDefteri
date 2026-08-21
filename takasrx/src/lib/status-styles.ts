/** Durum rozetleri için anlamlı renk sınıfları — tüm rozetlerin aynı gri tonda görünmesini önler. */
const STATUS_COLORS: Record<string, string> = {
  // Listing / need
  OPEN: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  MATCHED: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  CLOSED: "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  FULFILLED: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  // Offer / need response
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  ACCEPTED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400",
  // Shipment
  HAZIRLANIYOR: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  TESLIM_ALINDI: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  TESLIM_EDILDI: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

export function statusBadgeClass(status: string) {
  return STATUS_COLORS[status] ?? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
}
