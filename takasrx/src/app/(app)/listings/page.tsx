import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Açık",
  MATCHED: "Eşleşti",
  CLOSED: "Kapandı",
};

export default async function MyListingsPage() {
  const user = await requireUser();

  const listings = await prisma.listing.findMany({
    where: { userId: user.id },
    include: { group: true, _count: { select: { offers: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Talep Oluştur - Yönet</h1>
          <p className="mt-1 text-sm text-slate-600">
            Verdiğiniz tüm takas ilanları burada listelenir.
          </p>
        </div>
        <Link
          href="/groups"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Yeni İlan Ver
        </Link>
      </div>

      {listings.length === 0 ? (
        <p className="mt-8 text-sm text-slate-600">
          Henüz bir ilan vermediniz. Önce bir gruba katılın, ardından{" "}
          <Link href="/groups" className="text-emerald-700 hover:underline">
            grubunuzdan yeni ilan verin
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Başlık</th>
                <th className="px-4 py-3">Grup</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Teklif</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{l.title}</td>
                  <td className="px-4 py-3 text-slate-600">{l.group.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {STATUS_LABEL[l.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{l._count.offers}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/groups/${l.groupId}/listings/${l.id}`}
                      className="text-emerald-700 hover:underline"
                    >
                      Görüntüle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
