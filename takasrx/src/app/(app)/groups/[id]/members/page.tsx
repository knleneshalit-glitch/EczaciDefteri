import { notFound } from "next/navigation";
import { Users, Crown, UserMinus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { requireApprovedMember } from "@/lib/group-access";
import { removeMemberAction } from "@/app/actions/groups";

export default async function GroupMembersPage(props: PageProps<"/groups/[id]/members">) {
  const user = await requireUser();
  const { id } = await props.params;
  const membership = await requireApprovedMember(id, user.id);
  const isManager = membership.role === "MANAGER";

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) notFound();

  const members = await prisma.groupMember.findMany({
    where: { groupId: id, status: "APPROVED" },
    include: { user: true },
    orderBy: { user: { pharmacyName: "asc" } },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Grup Üyeleri
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{group.name}</p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Eczane Adı</th>
              <th className="px-4 py-3">Eczane GLN</th>
              <th className="px-4 py-3">Yönetici</th>
              <th className="px-4 py-3">Mail Adresi</th>
              <th className="px-4 py-3">Şehir</th>
              <th className="px-4 py-3">Adres</th>
              {isManager && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-slate-200 dark:border-slate-800/60 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                  {m.user.pharmacyName}
                  {m.role === "MANAGER" && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                      <Crown className="h-3 w-3" strokeWidth={1.75} />
                      Yönetici
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{m.user.gln}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{m.user.contactName}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{m.user.email}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                  {m.user.region}
                  {m.user.district ? ` / ${m.user.district}` : ""}
                </td>
                <td className="px-4 py-3 text-slate-500">{m.user.address ?? "—"}</td>
                {isManager && (
                  <td className="px-4 py-3 text-right">
                    {m.role !== "MANAGER" && (
                      <form action={removeMemberAction.bind(null, id, m.id)}>
                        <button
                          className="flex items-center gap-1 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                          title="Gruptan çıkar"
                        >
                          <UserMinus className="h-3.5 w-3.5" strokeWidth={1.75} />
                          Çıkar
                        </button>
                      </form>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={isManager ? 7 : 6} className="px-4 py-6 text-center text-slate-500">
                  Kayıt bulunamadı
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
