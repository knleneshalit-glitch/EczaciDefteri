import Link from "next/link";
import { ClipboardList, Plus, Search, CopyPlus, PauseCircle, PlayCircle, Eye } from "lucide-react";
import { effectiveUnitPrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { listingDisplayStatus, listingDisplayStatusClass } from "@/lib/status-styles";
import { closeExpiredTargetListingsForGroups } from "@/lib/listings";
import { pauseListingAction, reopenListingAction } from "@/app/actions/listings";
import ExportCsvButton from "@/components/ExportCsvButton";
import NewListingPicker from "./NewListingPicker";

const PAGE_SIZE = 25;

const STATUS_TABS = [
  { key: "tumu", label: "Tümü" },
  { key: "aktif", label: "Aktif" },
  { key: "hedef", label: "Hedefe Ulaşıldı" },
  { key: "pasif", label: "Pasif" },
  { key: "kapandi", label: "Kapandı" },
] as const;

const KIND_FILTERS = [
  { key: "tumu", label: "Tüm Türler" },
  { key: "stok", label: "Stoktan Teklif" },
  { key: "depo", label: "Depo Özel Şartı" },
  { key: "ozel", label: "Eczaneye Özel" },
] as const;

type StatusKey = (typeof STATUS_TABS)[number]["key"];
type KindKey = (typeof KIND_FILTERS)[number]["key"];

function statusTabOf(l: { status: string; targetReachedAt: Date | null }): Exclude<StatusKey, "tumu"> {
  const { key } = listingDisplayStatus(l);
  if (key === "PASSIVE") return "pasif";
  if (key === "TARGET") return "hedef";
  if (key === "OPEN") return "aktif";
  return "kapandi";
}

function matchesKind(l: { listingKind: string; targetUserId: string | null }, kind: KindKey) {
  if (kind === "stok") return l.listingKind === "STOK";
  if (kind === "depo") return l.listingKind === "DEPO_OZEL_SART";
  if (kind === "ozel") return l.targetUserId != null;
  return true;
}

export default async function MyListingsPage(props: PageProps<"/listings">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const durum = (STATUS_TABS.some((t) => t.key === sp.durum) ? sp.durum : "tumu") as StatusKey;
  const tur = (KIND_FILTERS.some((k) => k.key === sp.tur) ? sp.tur : "tumu") as KindKey;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id, status: "APPROVED" },
    include: { group: true },
    orderBy: { group: { name: "asc" } },
  });
  await closeExpiredTargetListingsForGroups(memberships.map((m) => m.groupId));

  const listings = await prisma.listing.findMany({
    where: { userId: user.id },
    include: {
      group: true,
      targetUser: { select: { pharmacyName: true, contactName: true } },
      offers: { where: { status: { in: ["PENDING", "ACCEPTED"] } }, select: { quantity: true, status: true } },
      _count: { select: { offers: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const openGroups = memberships.filter((m) => !m.group.closedAt).map((m) => m.group);

  const needle = q.toLocaleLowerCase("tr-TR");
  const searched = listings.filter(
    (l) =>
      matchesKind(l, tur) &&
      (!needle ||
        l.medicineName.toLocaleLowerCase("tr-TR").includes(needle) ||
        (l.barkod ?? "").includes(needle) ||
        l.group.name.toLocaleLowerCase("tr-TR").includes(needle))
  );
  const counts = new Map<StatusKey, number>([["tumu", searched.length]]);
  for (const l of searched) {
    const tab = statusTabOf(l);
    counts.set(tab, (counts.get(tab) ?? 0) + 1);
  }
  const visible = durum === "tumu" ? searched : searched.filter((l) => statusTabOf(l) === durum);
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Number(sp.sayfa) || 1));
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const csvRows = visible.map((l) => {
    const accepted = l.offers.filter((o) => o.status === "ACCEPTED").reduce((sum, o) => sum + o.quantity, 0);
    return [
      l.medicineName,
      l.barkod,
      l.group.name,
      l.listingKind === "DEPO_OZEL_SART" ? "Depo Özel Şartı" : "Stoktan Teklif",
      l.totalStock,
      l.dealBonusQuantity,
      l.birimFiyat,
      effectiveUnitPrice(l),
      l.kdvOrani,
      accepted,
      l.createdAt.toLocaleDateString("tr-TR"),
      l.expiryDate ? l.expiryDate.toLocaleDateString("tr-TR") : null,
      listingDisplayStatus(l).label,
      l._count.offers,
    ];
  });

  function hrefWith(next: { durum?: StatusKey; tur?: KindKey; sayfa?: number }) {
    const params = new URLSearchParams();
    const d = next.durum ?? durum;
    const t = next.tur ?? tur;
    if (d !== "tumu") params.set("durum", d);
    if (t !== "tumu") params.set("tur", t);
    if (q) params.set("q", q);
    if (next.sayfa && next.sayfa > 1) params.set("sayfa", String(next.sayfa));
    const s = params.toString();
    return s ? `/listings?${s}` : "/listings";
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            <ClipboardList className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
            Talep Oluştur - Yönet
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Verdiğiniz tüm takas ilanları burada listelenir.
          </p>
        </div>
        {openGroups.length > 0 ? (
          <NewListingPicker groups={openGroups.map((g) => ({ id: g.id, name: g.name }))} />
        ) : (
          <Link
            href="/groups"
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Gruba Katıl
          </Link>
        )}
      </div>

      {listings.length === 0 ? (
        <p className="mt-8 text-sm text-slate-600 dark:text-slate-400">
          {memberships.length === 0 ? (
            <>
              Henüz bir ilan vermediniz. Önce bir gruba katılın, ardından{" "}
              <Link href="/groups" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                grubunuzdan yeni ilan verin
              </Link>
              .
            </>
          ) : (
            "Henüz bir ilan vermediniz. Yukarıdan grubunuzu seçip ilk ilanı verin."
          )}
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {STATUS_TABS.map((t) => (
              <Link
                key={t.key}
                href={hrefWith({ durum: t.key })}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  durum === t.key
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-400"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    durum === t.key ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  {counts.get(t.key) ?? 0}
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1.5">
              {KIND_FILTERS.map((k) => (
                <Link
                  key={k.key}
                  href={hrefWith({ tur: k.key })}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    tur === k.key
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {k.label}
                </Link>
              ))}
            </div>
            <div className="ml-auto">
              <ExportCsvButton
                filename="ilanlarim"
                headers={["Ürün", "Barkod", "Grup", "Tür", "Toplam Stok", "MF", "Depo Fiyatı", "Net Fiyat", "KDV %", "Satılan", "İlan Tarihi", "SKT", "Durum", "Teklif"]}
                rows={csvRows}
              />
            </div>
            <form className="relative w-full max-w-xs">
              {durum !== "tumu" && <input type="hidden" name="durum" value={durum} />}
              {tur !== "tumu" && <input type="hidden" name="tur" value={tur} />}
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                strokeWidth={1.75}
              />
              <input
                name="q"
                defaultValue={q}
                placeholder="Ürün adı, barkod veya grup ara..."
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </form>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Başlık / Grup</th>
                  <th className="px-4 py-3">Miktar</th>
                  <th className="px-4 py-3">Birim Fiyat</th>
                  <th className="px-4 py-3">Dolum Oranı</th>
                  <th className="px-4 py-3">İlan Tarihi</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Teklif</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((l) => {
                  const display = listingDisplayStatus(l);
                  const hasBonus =
                    l.dealBonusQuantity != null &&
                    l.totalStock != null &&
                    l.dealBonusQuantity > 0 &&
                    l.dealBonusQuantity < l.totalStock;
                  const miktar = hasBonus
                    ? `${l.totalStock! - l.dealBonusQuantity!}+${l.dealBonusQuantity} MF`
                    : (l.totalStock ?? "—");
                  const netFiyat = effectiveUnitPrice(l);
                  const filledQty = l.offers
                    .filter((o) => (l.listingKind === "DEPO_OZEL_SART" ? true : o.status === "ACCEPTED"))
                    .reduce((sum, o) => sum + o.quantity, 0);
                  const fillPercent =
                    l.totalStock && l.totalStock > 0 ? Math.round((filledQty / l.totalStock) * 100) : null;
                  return (
                    <tr key={l.id} className="border-b border-slate-200 dark:border-slate-800/60 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{l.title}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          {l.group.name}
                          <span
                            className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              l.listingKind === "DEPO_OZEL_SART"
                                ? "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {l.listingKind === "DEPO_OZEL_SART" ? "Depo Şartı" : "Stoktan Teklif"}
                          </span>
                        </p>
                        {l.targetUser && (
                          <p className="text-[11px] text-indigo-600 dark:text-indigo-400">
                            Sadece {l.targetUser.pharmacyName ?? l.targetUser.contactName} için
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">{miktar}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {netFiyat != null ? `${netFiyat.toFixed(2)} ₺` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {fillPercent != null ? (
                          <div className="w-28">
                            <div className="flex justify-between text-[11px] text-slate-500">
                              <span>
                                {filledQty}/{l.totalStock}
                              </span>
                              <span className="font-semibold">%{Math.min(fillPercent, 999)}</span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                              <div
                                className={`h-full rounded-full ${fillPercent >= 100 ? "bg-red-500" : "bg-emerald-500"}`}
                                style={{ width: `${Math.min(fillPercent, 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {l.createdAt.toLocaleDateString("tr-TR")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`flex w-fit items-center whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${listingDisplayStatusClass(display.key)}`}
                        >
                          {display.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{l._count.offers}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <Link
                            href={`/groups/${l.groupId}/listings/${l.id}`}
                            title="Görüntüle"
                            className="flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Görüntüle
                          </Link>
                          {!l.group.closedAt && (
                            <Link
                              href={`/groups/${l.groupId}/new?from=${l.id}`}
                              title="Aynı şartlarda yeni ilan oluştur"
                              className="flex items-center gap-1 whitespace-nowrap rounded-md border border-emerald-500/40 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                            >
                              <CopyPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
                              Aynı Şartlarda
                            </Link>
                          )}
                          {l.status === "OPEN" && (
                            <form action={pauseListingAction.bind(null, l.groupId, l.id)}>
                              <button
                                title="İlanı geçici olarak yayından kaldır"
                                className="flex items-center gap-1 whitespace-nowrap rounded-md border border-orange-500/40 px-2 py-1 text-xs font-medium text-orange-700 dark:text-orange-400 hover:bg-orange-500/10"
                              >
                                <PauseCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                                Pasife Çek
                              </button>
                            </form>
                          )}
                          {l.status === "PASSIVE" && (
                            <form action={reopenListingAction.bind(null, l.groupId, l.id)}>
                              <button
                                title="İlanı tekrar yayına al"
                                className="flex items-center gap-1 whitespace-nowrap rounded-md border border-blue-500/40 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-500/10"
                              >
                                <PlayCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                                Yayına Al
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                      Bu filtreyle eşleşen ilan yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-500">
                <span>
                  Toplam {visible.length} kayıttan {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, visible.length)} arası
                </span>
                <div className="flex items-center gap-2">
                  {page > 1 && (
                    <Link href={hrefWith({ sayfa: page - 1 })} className="rounded border border-slate-300 dark:border-slate-700 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                      ‹ Önceki
                    </Link>
                  )}
                  <span>
                    Sayfa {page} / {totalPages}
                  </span>
                  {page < totalPages && (
                    <Link href={hrefWith({ sayfa: page + 1 })} className="rounded border border-slate-300 dark:border-slate-700 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                      Sonraki ›
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
