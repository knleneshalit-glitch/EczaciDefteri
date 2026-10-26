type StageInput = {
  status: string;
  printedAt: Date | null;
  buyerConfirmedAt?: Date | null;
};

/** Sevkiyatın ekranlarda gösterilecek aşaması. */
export function shipmentStage(s: StageInput) {
  if (s.status === "TESLIM_EDILDI") {
    return s.buyerConfirmedAt
      ? { key: "DELIVERED", label: "Eczacı Teslim Aldı", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" }
      : { key: "DELIVERED", label: "Dağıtıcı Teslim Etti", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" };
  }
  if (s.status === "TESLIM_ALINDI") {
    return { key: "PICKED", label: "Sürücü Teslim Aldı", className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400" };
  }
  if (s.printedAt) {
    return { key: "READY", label: "Sürücü Bekleniyor", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" };
  }
  return { key: "PREPARING", label: "Hazırlanıyor", className: "bg-orange-500/10 text-orange-700 dark:text-orange-400" };
}

/** Sevkiyatları koli koduna göre gruplar; kolisiz sevkiyatlar tek başına bir koli sayılır. */
export function groupByPackage<T extends { id: string; packageCode: string | null }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.packageCode ?? item.id;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return Array.from(groups.entries()).map(([key, list]) => ({ key, items: list }));
}
