import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Users,
  Wallet,
  Plus,
  Lock,
  Clock,
  XCircle,
  Check,
  X,
  Send,
  ShoppingBag,
  ArrowRight,
  HelpCircle,
  Ban,
  Unlock,
  Package,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { effectiveUnitPrice } from "@/lib/pricing";
import {
  approveMemberAction,
  rejectMemberAction,
  requestJoinAction,
  closeGroupAction,
  reopenGroupAction,
} from "@/app/actions/groups";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Açık",
  MATCHED: "Eşleşti",
  CLOSED: "Kapandı",
};

export default async function GroupDetailPage(props: PageProps<"/groups/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) notFound();

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: user.id } },
  });

  const isApproved = membership?.status === "APPROVED" || user.isSuperAdmin;
  const isManager = (membership?.role === "MANAGER" && membership?.status === "APPROVED") || user.isSuperAdmin;

  const [listings, pendingMembers] = await Promise.all([
    isApproved
      ? prisma.listing.findMany({
          where: { groupId: id },
          include: {
            user: true,
            _count: { select: { offers: true } },
            offers: { where: { status: "ACCEPTED" }, select: { quantity: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    isManager
      ? prisma.groupMember.findMany({
          where: { groupId: id, status: "PENDING" },
          include: { user: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{group.name}</h1>
            {group.closedAt && (
              <span className="flex items-center gap-1 rounded bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                <Ban className="h-3.5 w-3.5" strokeWidth={1.75} />
                Kapatıldı
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">{group.region}</p>
          {group.description && (
            <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">{group.description}</p>
          )}
        </div>
        {isApproved && (
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href={`/groups/${group.id}/members`}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Users className="h-4 w-4" strokeWidth={1.75} />
              Grup Üyeleri
            </Link>
            <Link
              href={`/groups/${group.id}/balances`}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Wallet className="h-4 w-4" strokeWidth={1.75} />
              Grup Bakiyeleri
            </Link>
            <Link
              href={`/groups/${group.id}/needs`}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
              İhtiyaç Bildirimleri
            </Link>
            {!group.closedAt && (
              <Link
                href={`/groups/${group.id}/new`}
                className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                Yeni İlan Ver
              </Link>
            )}
            {isManager && (
              <form action={(group.closedAt ? reopenGroupAction : closeGroupAction).bind(null, group.id)}>
                <button
                  className={
                    group.closedAt
                      ? "flex items-center gap-1.5 rounded-md border border-emerald-500/40 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                      : "flex items-center gap-1.5 rounded-md border border-red-500/40 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
                  }
                >
                  {group.closedAt ? (
                    <>
                      <Unlock className="h-4 w-4" strokeWidth={1.75} />
                      Grubu Yeniden Aç
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4" strokeWidth={1.75} />
                      Grubu Kapat
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {!membership && (
        <div className="mt-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
          <Lock className="mx-auto h-6 w-6 text-slate-500" strokeWidth={1.5} />
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Bu grubun takas ilanlarını görmek için üye olmanız gerekiyor.
          </p>
          {group.closedAt ? (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">Bu grup kapatıldığı için katılım kabul edilmiyor.</p>
          ) : (
            <form action={requestJoinAction.bind(null, group.id)} className="mt-4">
              <button className="mx-auto flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                <Send className="h-4 w-4" strokeWidth={1.75} />
                Katılma İsteği Gönder
              </button>
            </form>
          )}
        </div>
      )}

      {membership?.status === "PENDING" && (
        <div className="mt-8 flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-6 text-center text-sm text-amber-800 dark:text-amber-300">
          <Clock className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Katılım isteğiniz grup yöneticisinin onayını bekliyor.
        </div>
      )}

      {membership?.status === "REJECTED" && (
        <div className="mt-8 flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-800 dark:text-red-300">
          <XCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Bu gruba katılım isteğiniz reddedildi.
        </div>
      )}

      {isManager && pendingMembers.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
            Onay Bekleyen Katılım İstekleri
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {pendingMembers.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
              >
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {m.user.pharmacyName} ({m.user.email})
                </span>
                <div className="flex gap-2">
                  <form action={approveMemberAction.bind(null, group.id, m.id)}>
                    <button className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500">
                      <Check className="h-3.5 w-3.5" strokeWidth={2} />
                      Onayla
                    </button>
                  </form>
                  <form action={rejectMemberAction.bind(null, group.id, m.id)}>
                    <button className="flex items-center gap-1 rounded-md border border-red-500/40 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10">
                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                      Reddet
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isApproved && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <ShoppingBag className="h-4 w-4 text-slate-600 dark:text-slate-400" strokeWidth={1.75} />
            Grubun Teklifleri ({listings.length})
          </h2>
          {listings.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Bu grupta henüz ilan yok. İlk ilanı siz verin.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {listings.map((listing) => {
                const acceptedQty = listing.offers.reduce((sum, o) => sum + o.quantity, 0);
                const remaining =
                  listing.totalStock != null ? Math.max(0, listing.totalStock - acceptedQty) : null;
                const hasBonus =
                  listing.dealBonusQuantity != null &&
                  listing.totalStock != null &&
                  listing.dealBonusQuantity > 0 &&
                  listing.dealBonusQuantity < listing.totalStock;
                const netFiyat = effectiveUnitPrice(listing);
                const daysLeft = listing.endDate
                  ? Math.ceil((listing.endDate.getTime() - Date.now()) / 86400000)
                  : null;

                return (
                  <Link
                    key={listing.id}
                    href={`/groups/${group.id}/listings/${listing.id}`}
                    className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm transition hover:border-emerald-400 hover:shadow-md"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 text-white">
                      <Package className="h-6 w-6" strokeWidth={1.75} />
                    </span>

                    <div className="min-w-[160px] flex-1">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{listing.medicineName}</p>
                      <p className="text-xs text-slate-500">
                        {listing.barkod ?? "—"} · {group.region}
                      </p>
                    </div>

                    {hasBonus && (
                      <div className="text-center">
                        <span className="rounded-full border-2 border-orange-400 bg-orange-100 dark:bg-orange-500/20 px-2.5 py-0.5 text-xs font-bold text-orange-700 dark:text-orange-400">
                          {listing.totalStock! - listing.dealBonusQuantity!}+{listing.dealBonusQuantity} MF
                        </span>
                        {listing.expiryDate && (
                          <p className="mt-1 text-[11px] text-slate-500">
                            Miad: {listing.expiryDate.toLocaleDateString("tr-TR")}
                          </p>
                        )}
                      </div>
                    )}

                    {listing.totalStock != null && (
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Kalan</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {remaining} / {listing.totalStock}
                        </p>
                      </div>
                    )}

                    <div className="text-center">
                      {netFiyat != null && (
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">{netFiyat.toFixed(2)} ₺ Net</p>
                      )}
                      {hasBonus && listing.birimFiyat != null && (
                        <p className="text-xs text-slate-500 line-through">{listing.birimFiyat.toFixed(2)} ₺ Depo</p>
                      )}
                    </div>

                    {daysLeft != null && daysLeft >= 0 && (
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{daysLeft} gün kaldı</p>
                    )}

                    <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white">
                      {STATUS_LABEL[listing.status] === "Açık" ? "KATIL" : STATUS_LABEL[listing.status]}
                      {STATUS_LABEL[listing.status] === "Açık" && (
                        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
