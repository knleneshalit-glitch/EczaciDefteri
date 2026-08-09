import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { REGIONS } from "@/lib/regions";
import { requestJoinAction } from "@/app/actions/groups";

export default async function GroupsPage(props: PageProps<"/groups">) {
  const user = await requireUser();
  const { region } = await props.searchParams;
  const selectedRegion = typeof region === "string" && region ? region : user.region;

  const [groups, myMemberships] = await Promise.all([
    prisma.group.findMany({
      where: { region: selectedRegion },
      include: { _count: { select: { members: { where: { status: "APPROVED" } } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.groupMember.findMany({ where: { userId: user.id } }),
  ]);

  const membershipByGroup = new Map(myMemberships.map((m) => [m.groupId, m]));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Takas Grupları</h1>
        <Link
          href="/groups/new"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Yeni Grup Kur
        </Link>
      </div>

      <form className="mt-6 flex items-center gap-2">
        <label className="text-sm text-slate-400" htmlFor="region">
          Bölge:
        </label>
        <select
          id="region"
          name="region"
          defaultValue={selectedRegion}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-sm"
        >
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
        >
          Filtrele
        </button>
      </form>

      <ul className="mt-6 flex flex-col gap-3">
        {groups.length === 0 && (
          <p className="text-sm text-slate-400">
            {selectedRegion} bölgesinde henüz bir grup yok. İlk grubu siz kurun.
          </p>
        )}
        {groups.map((group) => {
          const membership = membershipByGroup.get(group.id);
          return (
            <li
              key={group.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-4"
            >
              <div>
                <Link
                  href={`/groups/${group.id}`}
                  className="font-medium text-slate-100 hover:text-emerald-700"
                >
                  {group.name}
                </Link>
                <p className="text-sm text-slate-500">
                  {group.region} · {group._count.members} üye
                </p>
                {group.description && (
                  <p className="mt-1 text-sm text-slate-400">{group.description}</p>
                )}
              </div>

              {membership?.status === "APPROVED" ? (
                <span className="rounded bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
                  Üyesiniz
                </span>
              ) : membership?.status === "PENDING" ? (
                <span className="rounded bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400">
                  Onay Bekliyor
                </span>
              ) : (
                <form action={requestJoinAction.bind(null, group.id)}>
                  <button className="rounded-md border border-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10">
                    Katılma İsteği Gönder
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
