import { notFound } from "next/navigation";
import { Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { requireApprovedMember } from "@/lib/group-access";
import { accrueInterestForGroup, getGroupBalances } from "@/lib/ledger";
import InterestRateForm from "./InterestRateForm";

function money(n: number) {
  return `${n.toFixed(2)} ₺`;
}

export default async function GroupBalancesPage(props: PageProps<"/groups/[id]/balances">) {
  const user = await requireUser();
  const { id } = await props.params;
  const membership = await requireApprovedMember(id, user.id);
  const isManager = membership.role === "MANAGER";

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) notFound();

  await accrueInterestForGroup(id);
  const balances = await getGroupBalances(id);
  const balanceByUser = new Map(balances.map((b) => [b.userId, b]));

  const members = await prisma.groupMember.findMany({
    where: { groupId: id, status: "APPROVED" },
    include: { user: true },
  });

  const rows = members
    .map((m) => {
      const b = balanceByUser.get(m.userId) ?? { bakiye: 0, grupYuku: 0, toplam: 0 };
      return { member: m, ...b };
    })
    .sort((a, b) => a.toplam - b.toplam);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Grup Bakiyeleri / Grup Yükü
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{group.name}</p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        Bakiye: alım/satım hareketlerinden oluşan cari tutar. Grup Yükü: bakiyeye her ayın
        1'inde işlenen aylık faizin birikimi. Toplam: bakiye + grup yükü.
      </p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        Güncel aylık faiz oranı: <span className="font-medium">%{(group.monthlyInterestRate * 100).toFixed(3).replace(/\.?0+$/, "") || "0"}</span>
      </p>

      {isManager && <InterestRateForm groupId={group.id} currentRate={group.monthlyInterestRate} />}

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Eczane İlçe</th>
              <th className="px-4 py-3">Eczane GLN</th>
              <th className="px-4 py-3">Eczane Adı</th>
              <th className="px-4 py-3 text-right">Bakiye</th>
              <th className="px-4 py-3 text-right">Grup Yükü</th>
              <th className="px-4 py-3 text-right">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.member.id} className="border-b border-slate-200 dark:border-slate-800/60 last:border-0">
                <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.member.user.district ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.member.user.gln}</td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                  {row.member.user.pharmacyName}
                  {row.member.userId === user.id && (
                    <span className="ml-2 rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                      Siz
                    </span>
                  )}
                </td>
                <td
                  className={`px-4 py-3 text-right ${row.bakiye < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}
                >
                  {money(row.bakiye)}
                </td>
                <td
                  className={`px-4 py-3 text-right ${row.grupYuku < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}
                >
                  {money(row.grupYuku)}
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${row.toplam < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}
                >
                  {money(row.toplam)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
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
