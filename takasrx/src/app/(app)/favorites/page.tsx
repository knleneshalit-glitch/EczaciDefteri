import Link from "next/link";
import { Star, Trash2, BellRing, ArrowRight, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePharmacy } from "@/lib/require-user";
import { effectiveUnitPrice } from "@/lib/pricing";
import { findFavoriteMatches } from "@/lib/favorite-matches";
import { removeFavoriteAction } from "@/app/actions/favorites";
import FavoriteAddForm from "./FavoriteAddForm";

export default async function FavoritesPage() {
  const user = await requirePharmacy();

  const favorites = await prisma.favoriteProduct.findMany({
    where: { userId: user.id },
    orderBy: { medicineName: "asc" },
  });
  const matches = await findFavoriteMatches(user.id, favorites);

  const matchesFor = (f: { medicineName: string; barkod: string | null }) =>
    matches.filter((l) => l.medicineName === f.medicineName || (!!f.barkod && l.barkod === f.barkod));

  const card = "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <Star className="h-6 w-6 fill-amber-400 text-amber-500" strokeWidth={1.75} />
        Favori Ürünlerim
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Takip etmek istediğiniz ürünleri ekleyin; gruplarınızdan birinde bu ürün ilana çıktığı anda
        bildirim alırsınız.
      </p>

      <section className={`${card} mt-6 p-5`}>
        <FavoriteAddForm />
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
          Favorilerim ({favorites.length})
        </h2>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800/40 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Ürün</th>
              <th className="px-4 py-2">Barkod</th>
              <th className="px-4 py-2">Gruplarımdaki Aktif İlan</th>
              <th className="px-4 py-2">En İyi Net Fiyat</th>
              <th className="px-4 py-2 text-right" />
            </tr>
          </thead>
          <tbody>
            {favorites.map((f) => {
              const own = matchesFor(f);
              const prices = own.map((l) => effectiveUnitPrice(l)).filter((p): p is number => p != null);
              const best = prices.length ? Math.min(...prices) : null;
              return (
                <tr key={f.id} className="border-t border-slate-200 dark:border-slate-800/60">
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                    <span className="flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" strokeWidth={1.75} />
                      {f.medicineName}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{f.barkod ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {own.length > 0 ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        {own.length} ilan
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Şu an ilan yok</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                    {best != null ? `${best.toFixed(2)} ₺` : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      {own.length > 0 && (
                        <Link
                          href={`/market?q=${encodeURIComponent(f.medicineName)}`}
                          className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          İlanları Gör
                          <ArrowRight className="h-3 w-3" strokeWidth={2} />
                        </Link>
                      )}
                      <form action={removeFavoriteAction.bind(null, f.id)}>
                        <button
                          title="Favorilerden çıkar"
                          className="flex items-center gap-1 rounded-md border border-red-500/40 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                          Kaldır
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {favorites.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                  Henüz favori ürününüz yok. Yukarıdan ekleyebilir ya da bir ilan sayfasındaki yıldıza
                  basabilirsiniz.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <BellRing className="h-4 w-4 text-amber-500" strokeWidth={1.75} />
          Ürün Bildirimleri — favorilerinizle eşleşen aktif ilanlar ({matches.length})
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {matches.map((l) => {
            const net = effectiveUnitPrice(l);
            const sold = l.offers.reduce((sum, o) => sum + o.quantity, 0);
            const remaining = l.totalStock != null ? Math.max(0, l.totalStock - sold) : null;
            return (
              <Link
                key={l.id}
                href={`/groups/${l.groupId}/listings/${l.id}`}
                className={`${card} flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 hover:border-amber-400`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
                  <Package className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-[200px] flex-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{l.medicineName}</p>
                  <p className="text-xs text-slate-500">
                    {l.user.pharmacyName ?? l.user.contactName} · {l.group.name} · {l.createdAt.toLocaleDateString("tr-TR")}
                  </p>
                </div>
                {remaining != null && (
                  <p className="text-xs text-slate-500">
                    Kalan <span className="font-semibold text-slate-800 dark:text-slate-200">{remaining}</span>
                  </p>
                )}
                <p className="font-bold text-emerald-600 dark:text-emerald-400">{net != null ? `${net.toFixed(2)} ₺ Net` : "—"}</p>
                <ArrowRight className="h-4 w-4 text-slate-400" strokeWidth={2} />
              </Link>
            );
          })}
          {matches.length === 0 && (
            <p className="text-sm text-slate-500">Favorilerinizle eşleşen aktif ilan şu an yok.</p>
          )}
        </div>
      </section>
    </div>
  );
}
