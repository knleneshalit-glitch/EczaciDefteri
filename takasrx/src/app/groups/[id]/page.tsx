import Link from "next/link";
import { notFound } from "next/navigation";
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
          include: { user: true, _count: { select: { offers: true } } },
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
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{group.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{group.region}</p>
          {group.description && (
            <p className="mt-2 max-w-xl text-sm text-slate-600">{group.description}</p>
          )}
        </div>
        {isApproved && (
          <Link
            href={`/groups/${group.id}/new`}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Yeni İlan Ver
          </Link>
        )}
      </div>

      {!membership && (
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-600">
            Bu grubun takas ilanlarını görmek için üye olmanız gerekiyor.
          </p>
          <form action={requestJoinAction.bind(null, group.id)} className="mt-4">
            <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              Katılma İsteği Gönder
            </button>
          </form>
        </div>
      )}

      {membership?.status === "PENDING" && (
        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800">
          Katılım isteğiniz grup yöneticisinin onayını bekliyor.
        </div>
      )}

      {membership?.status === "REJECTED" && (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          Bu gruba katılım isteğiniz reddedildi.
        </div>
      )}

      {isManager && pendingMembers.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-900">
            Onay Bekleyen Katılım İstekleri
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {pendingMembers.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
              >
                <span className="text-sm text-slate-700">
                  {m.user.pharmacyName} ({m.user.email})
                </span>
                <div className="flex gap-2">
                  <form action={approveMemberAction.bind(null, group.id, m.id)}>
                    <button className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700">
                      Onayla
                    </button>
                  </form>
                  <form action={rejectMemberAction.bind(null, group.id, m.id)}>
                    <button className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
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
          <h2 className="text-sm font-semibold text-slate-900">Takas İlanları</h2>
          {listings.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              Bu grupta henüz ilan yok. İlk ilanı siz verin.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {listings.map((listing) => (
                <li key={listing.id}>
                  <Link
                    href={`/groups/${group.id}/listings/${listing.id}`}
                    className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-emerald-400"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-900">{listing.title}</p>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {STATUS_LABEL[listing.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {listing.medicineName}
                      {listing.quantity ? ` · ${listing.quantity}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {listing.user.pharmacyName} · {listing._count.offers} teklif
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
