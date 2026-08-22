import Link from "next/link";
import { Users, Plus, CheckCircle2, Clock, Send, Search } from "lucide-react";
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
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
          <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
          Takas Grupları
        </h1>
        <Link
          href="/groups/new"
          className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Yeni Grup Kur
        </Link>
      </div>

      <form className="mt-6 flex items-center gap-2">
        <label className="text-sm text-slate-600 dark:text-slate-400" htmlFor="region">
          Bölge:
        </label>
        <select
          id="region"
          name="region"
          defaultValue={selectedRegion}
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100"
        >
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
          Filtrele
        </button>
      </form>

      <ul className="mt-6 flex flex-col gap-3">
        {groups.length === 0 && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {selectedRegion} bölgesinde henüz bir grup yok. İlk grubu siz kurun.
          </p>
        )}
        {groups.map((group) => {
          const membership = membershipByGroup.get(group.id);
          return (
            <li
              key={group.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
            >
              <div>
                <Link
                  href={`/groups/${group.id}`}
                  className="font-medium text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  {group.name}
                </Link>
                <p className="text-sm text-slate-500">
                  {group.region} · {group._count.members} üye
                </p>
                {group.description && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{group.description}</p>
                )}
              </div>

              {membership?.status === "APPROVED" ? (
                <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Üyesiniz
                </span>
              ) : membership?.status === "PENDING" ? (
                <span className="flex items-center gap-1 rounded bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Onay Bekliyor
                </span>
              ) : (
                <form action={requestJoinAction.bind(null, group.id)}>
                  <button className="flex items-center gap-1 rounded-md border border-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10">
                    <Send className="h-3.5 w-3.5" strokeWidth={1.75} />
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
