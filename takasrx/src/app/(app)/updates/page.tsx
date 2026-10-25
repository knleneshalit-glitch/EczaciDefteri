import Link from "next/link";
import { History, Search, ChevronLeft, ChevronRight, FileText, MessageSquareText } from "lucide-react";
import type { ListingChangeType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { LISTING_CHANGE_LABEL, LISTING_CHANGE_TYPES } from "@/lib/listing-changes";
import { listingDisplayStatus, listingDisplayStatusClass } from "@/lib/status-styles";
import { foldTr } from "@/lib/search";

const PAGE_SIZE = 15;

const DURUM_FILTERS = [
  { key: "", label: "Tümü" },
  { key: "OPEN", label: "Açık" },
  { key: "TARGET", label: "Hedefe Ulaşıldı" },
  { key: "PASSIVE", label: "Pasif" },
  { key: "CLOSED", label: "Kapandı" },
];

function param(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function ListingUpdatesPage(props: PageProps<"/updates">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const groupFilter = param(sp.group);
  const eczane = param(sp.eczane);
  const urun = param(sp.urun);
  const tip = LISTING_CHANGE_TYPES.includes(param(sp.tip)) ? param(sp.tip) : "";
  const durum = DURUM_FILTERS.some((d) => d.key === param(sp.durum)) ? param(sp.durum) : "";
  const selectedId = param(sp.sel);

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id, status: "APPROVED" },
    include: { group: { select: { id: true, name: true } } },
    orderBy: { group: { name: "asc" } },
  });
  const myGroupIds = memberships.map((m) => m.groupId);
  const groupIds = groupFilter
    ? user.isSuperAdmin || myGroupIds.includes(groupFilter)
      ? [groupFilter]
      : []
    : myGroupIds;

  const changes =
    groupIds.length > 0 || (user.isSuperAdmin && !groupFilter)
      ? await prisma.listingChange.findMany({
          where: {
            ...(user.isSuperAdmin && !groupFilter ? {} : { groupId: { in: groupIds } }),
            ...(tip ? { changeType: tip as ListingChangeType } : {}),
            ...(user.isSuperAdmin
              ? {}
              : {
                  listing: {
                    OR: [{ targetUserId: null }, { targetUserId: user.id }, { userId: user.id }],
                  },
                }),
          },
          include: {
            listing: {
              select: {
                id: true,
                groupId: true,
                medicineName: true,
                description: true,
                status: true,
                targetReachedAt: true,
                userId: true,
              },
            },
            user: { select: { pharmacyName: true, contactName: true } },
            group: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 2000,
        })
      : [];

  const eczaneNeedle = foldTr(eczane);
  const urunNeedle = foldTr(urun);
  const filtered = changes.filter((c) => {
    // Pasif ilanların değişikliklerini sadece ilan sahibi görür.
    if (c.listing.status === "PASSIVE" && c.listing.userId !== user.id && !user.isSuperAdmin) return false;
    const pharmacy = foldTr(c.user.pharmacyName ?? c.user.contactName);
    if (eczaneNeedle && !pharmacy.includes(eczaneNeedle)) return false;
    if (urunNeedle && !foldTr(c.listing.medicineName).includes(urunNeedle)) return false;
    if (durum) {
      const key = listingDisplayStatus(c.listing).key;
      if (durum === "CLOSED" ? key !== "CLOSED" && key !== "MATCHED" : key !== durum) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Number(param(sp.sayfa)) || 1));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = filtered.find((c) => c.id === selectedId) ?? null;

  function hrefWith(next: Record<string, string | number | null>) {
    const params = new URLSearchParams();
    const current: Record<string, string> = { group: groupFilter, eczane, urun, tip, durum, sayfa: String(page), sel: selectedId };
    for (const [k, v] of Object.entries({ ...current, ...next })) {
      const s = v == null ? "" : String(v);
      if (s && !(k === "sayfa" && s === "1")) params.set(k, s);
    }
    const qs = params.toString();
    return qs ? `/updates?${qs}` : "/updates";
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none";

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <History className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Grup İçindeki Teklif Güncellemeleri
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Gruplarınızdaki ilanlarda yapılan fiyat, şart, stok, miad ve durum değişikliklerinin kaydı.
      </p>

      <form className="mt-6 grid gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <select name="group" defaultValue={groupFilter} className={inputClass}>
          <option value="">Tüm Gruplarım</option>
          {memberships.map((m) => (
            <option key={m.groupId} value={m.groupId}>
              {m.group.name}
            </option>
          ))}
        </select>
        <input name="eczane" defaultValue={eczane} placeholder="Eczane adı ara..." className={inputClass} />
        <input name="urun" defaultValue={urun} placeholder="Ürün adı ara..." className={inputClass} />
        <select name="tip" defaultValue={tip} className={inputClass}>
          <option value="">Değişim Tipi: Tümü</option>
          {LISTING_CHANGE_TYPES.map((t) => (
            <option key={t} value={t}>
              {LISTING_CHANGE_LABEL[t]}
            </option>
          ))}
        </select>
        <select name="durum" defaultValue={durum} className={inputClass}>
          {DURUM_FILTERS.map((d) => (
            <option key={d.key} value={d.key}>
              Durum: {d.label}
            </option>
          ))}
        </select>
        <button className="flex items-center justify-center gap-1.5 rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400">
          <Search className="h-4 w-4" strokeWidth={2} />
          Ara
        </button>
      </form>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Kayıt Tarihi</th>
                  <th className="px-4 py-3">Değişim Tipi</th>
                  <th className="px-4 py-3">Eczane Adı</th>
                  <th className="px-4 py-3">Ürün Adı</th>
                  <th className="px-4 py-3">Durum</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((c) => {
                  const display = listingDisplayStatus(c.listing);
                  const isSelected = selected?.id === c.id;
                  const rowHref = hrefWith({ sel: c.id });
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-slate-200 dark:border-slate-800/60 last:border-0 ${
                        isSelected ? "bg-emerald-50 dark:bg-emerald-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        <Link href={rowHref} scroll={false} className="block">
                          {c.createdAt.toLocaleString("tr-TR", {
                            dateStyle: "short",
                            timeStyle: "short",
                            timeZone: "Europe/Istanbul",
                          })}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                        <Link href={rowHref} scroll={false} className="block">
                          {LISTING_CHANGE_LABEL[c.changeType] ?? c.changeType}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                        <Link href={rowHref} scroll={false} className="block">
                          {c.user.pharmacyName ?? c.user.contactName}
                          <span className="block text-[11px] text-slate-500">{c.group.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                        <Link href={rowHref} scroll={false} className="block">
                          {c.listing.medicineName}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${listingDisplayStatusClass(display.key)}`}
                        >
                          {display.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-500">
            <span>
              Toplam {filtered.length} kayıttan{" "}
              {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filtered.length)} arası
            </span>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  href={hrefWith({ sayfa: page - 1, sel: null })}
                  className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                </Link>
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 dark:border-slate-800 opacity-40">
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                </span>
              )}
              <span>
                Sayfa {page} / {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={hrefWith({ sayfa: page + 1, sel: null })}
                  className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                </Link>
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 dark:border-slate-800 opacity-40">
                  <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h2 className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <FileText className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
              Eczane Açıklaması
            </h2>
            {selected ? (
              <p className="mt-3 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">
                {selected.listing.description || "İlan sahibi açıklama girmemiş."}
              </p>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Lütfen detayını görmek istediğiniz kaydı seçin.</p>
            )}
          </section>
          <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h2 className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <MessageSquareText className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
              Güncelleme Açıklaması
            </h2>
            {selected ? (
              <div className="mt-3 text-sm">
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {LISTING_CHANGE_LABEL[selected.changeType] ?? selected.changeType}
                </p>
                {selected.oldValue && (
                  <p className="mt-2 whitespace-pre-line text-xs text-slate-500">
                    <span className="font-semibold uppercase">Önceki:</span> {selected.oldValue}
                  </p>
                )}
                <p className="mt-1 whitespace-pre-line text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-semibold uppercase">Yeni:</span> {selected.newValue ?? "—"}
                </p>
                {selected.note && (
                  <p className="mt-3 rounded-md bg-slate-100 dark:bg-slate-800 p-2 text-xs italic text-slate-600 dark:text-slate-400">
                    “{selected.note}”
                  </p>
                )}
                <Link
                  href={`/groups/${selected.listing.groupId}/listings/${selected.listing.id}`}
                  className="mt-3 inline-block text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  İlana git →
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Lütfen detayını görmek istediğiniz kaydı seçin.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
