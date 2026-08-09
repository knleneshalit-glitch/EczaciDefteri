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
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import {
  approveMemberAction,
  rejectMemberAction,
  requestJoinAction,
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

  const isApproved = membership?.status === "APPROVED";
  const isManager = membership?.role === "MANAGER" && isApproved;

  const [listings, pendingMembers] = await Promise.all([
    isApproved
      ? prisma.listing.findMany({
          where: { groupId: id },
          include: {
            user: true,
            _count: { select: { offers: true } },
            tiers: { orderBy: { minQuantity: "asc" } },
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
          <h1 className="text-2xl font-bold text-slate-100">{group.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{group.region}</p>
          {group.description && (
            <p className="mt-2 max-w-xl text-sm text-slate-400">{group.description}</p>
          )}
        </div>
        {isApproved && (
          <div className="flex gap-2">
            <Link
              href={`/groups/${group.id}/members`}
              className="flex items-center gap-1.5 rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              <Users className="h-4 w-4" strokeWidth={1.75} />
              Grup Üyeleri
            </Link>
            <Link
              href={`/groups/${group.id}/balances`}
              className="flex items-center gap-1.5 rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              <Wallet className="h-4 w-4" strokeWidth={1.75} />
              Grup Bakiyeleri
            </Link>
            <Link
              href={`/groups/${group.id}/new`}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Yeni İlan Ver
            </Link>
          </div>
        )}
      </div>

      {!membership && (
        <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-6 text-center">
          <Lock className="mx-auto h-6 w-6 text-slate-500" strokeWidth={1.5} />
          <p className="mt-2 text-sm text-slate-400">
            Bu grubun takas ilanlarını görmek için üye olmanız gerekiyor.
          </p>
          <form action={requestJoinAction.bind(null, group.id)} className="mt-4">
            <button className="mx-auto flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
              <Send className="h-4 w-4" strokeWidth={1.75} />
              Katılma İsteği Gönder
            </button>
          </form>
        </div>
      )}

      {membership?.status === "PENDING" && (
        <div className="mt-8 flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-6 text-center text-sm text-amber-300">
          <Clock className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Katılım isteğiniz grup yöneticisinin onayını bekliyor.
        </div>
      )}

      {membership?.status === "REJECTED" && (
        <div className="mt-8 flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-300">
          <XCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Bu gruba katılım isteğiniz reddedildi.
        </div>
      )}

      {isManager && pendingMembers.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Clock className="h-4 w-4 text-amber-400" strokeWidth={1.75} />
            Onay Bekleyen Katılım İstekleri
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {pendingMembers.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-3"
              >
                <span className="text-sm text-slate-300">
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
                    <button className="flex items-center gap-1 rounded-md border border-red-500/40 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10">
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
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <ShoppingBag className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
            Grubun Teklifleri ({listings.length})
          </h2>
          {listings.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">
              Bu grupta henüz ilan yok. İlk ilanı siz verin.
            </p>
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => {
                const baseTier = listing.tiers[0] ?? null;
                const acceptedQty = listing.offers.reduce((sum, o) => sum + o.quantity, 0);
                const hedef = listing.hedefAlim;
                const kalan = hedef != null ? Math.max(0, hedef - acceptedQty) : null;
                const progress =
                  hedef && hedef > 0 ? Math.min(100, (acceptedQty / hedef) * 100) : 0;
                const daysLeft = listing.endDate
                  ? Math.ceil((listing.endDate.getTime() - Date.now()) / 86400000)
                  : null;

                return (
                  <Link
                    key={listing.id}
                    href={`/groups/${group.id}/listings/${listing.id}`}
                    className="flex flex-col rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/20 transition hover:border-emerald-500/70 hover:shadow-emerald-950/40"
                  >
                    <div className="flex items-start justify-between">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[11px] font-bold leading-tight text-emerald-400">
                        {baseTier ? `${baseTier.minQuantity}+${baseTier.bonusQuantity}` : "1+0"}
                        <br />
                        MF
                      </span>
                      <div className="text-right">
                        {listing.expiryDate && (
                          <p className="text-[11px] text-slate-500">
                            Miad: {listing.expiryDate.toLocaleDateString("tr-TR")}
                          </p>
                        )}
                        {daysLeft != null && daysLeft >= 0 && (
                          <p className="text-[11px] text-amber-400">{daysLeft} gün kaldı</p>
                        )}
                      </div>
                    </div>

                    <p className="mt-3 font-medium text-slate-100">{listing.title}</p>
                    <p className="text-xs text-slate-500">
                      {listing.medicineName}
                      {listing.barkod ? ` · ${listing.barkod}` : ""}
                    </p>

                    <span className="mt-2 inline-block w-fit rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
                      {group.name}
                    </span>

                    {hedef != null && (
                      <div className="mt-3">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Alım: {acceptedQty} · Hedef: {hedef} · Kalan: {kalan}
                        </p>
                      </div>
                    )}

                    <div className="mt-auto flex items-end justify-between pt-3">
                      <div>
                        {baseTier && listing.birimFiyat != null && (
                          <p className="text-sm font-semibold text-slate-100">
                            Net:{" "}
                            {Math.max(
                              0,
                              listing.birimFiyat -
                                (listing.birimFiyat * baseTier.discountPercent) / 100 -
                                baseTier.discountAmount
                            ).toFixed(2)}{" "}
                            ₺
                          </p>
                        )}
                        {listing.birimFiyat != null && (
                          <p className="text-xs text-slate-500">
                            Depo: {listing.birimFiyat.toFixed(2)} ₺
                          </p>
                        )}
                      </div>
                      <span className="flex items-center gap-1 rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white">
                        {STATUS_LABEL[listing.status] === "Açık" ? "KATIL" : STATUS_LABEL[listing.status]}
                        {STATUS_LABEL[listing.status] === "Açık" && (
                          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                        )}
                      </span>
                    </div>
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
