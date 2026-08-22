import { notFound } from "next/navigation";
import { Wallet, RefreshCcw, Info, PauseCircle, PlayCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { requireApprovedMember } from "@/lib/group-access";
import { accrueInterestForGroup, getGroupBalances } from "@/lib/ledger";
import { yearEndSettlementAction, toggleInterestEnabledAction } from "@/app/actions/groups";
import InterestRateForm from "./InterestRateForm";
import ManualBalanceForm from "./ManualBalanceForm";

function money(n: number) {
  return `${n.toFixed(2)} ₺`;
}

export default async function GroupBalancesPage(props: PageProps<"/groups/[id]/balances">) {
  const user = await requireUser();
  const { id } = await props.params;
  const membership = await requireApprovedMember(id, user);
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

      <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-slate-600 dark:text-slate-400">
        <p className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
          <Info className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
          Grup Yükü Nasıl Hesaplanır?
        </p>
        <p className="mt-2">
          <span className="font-medium">Bakiye</span>, alım/satım (TRADE) ve manuel (MANUAL)
          hareketlerinden oluşan ham cari tutardır. <span className="font-medium">Grup Yükü</span>{" "}
          ise her ayın 1'inde otomatik olarak işlenen aylık faizin birikimidir:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>Her ayın başında, o ana kadarki bakiyeniz (sadece alım/satım ve manuel hareketler; önceki grup yükleri hariç) esas alınır.</li>
          <li>Bu tutar, güncel aylık faiz oranıyla çarpılıp o ayın grup yükü olarak eklenir.</li>
          <li>Faiz, faiz üzerinden işlemez (bileşik değildir) — her ay yalnızca asıl bakiye üzerinden hesaplanır.</li>
          <li><span className="font-medium">Toplam</span> = Bakiye + Grup Yükü.</li>
        </ul>
        <p className="mt-2">
          Güncel aylık faiz oranı:{" "}
          <span className="font-medium">%{(group.monthlyInterestRate * 100).toFixed(3).replace(/\.?0+$/, "") || "0"}</span>
          {" · "}
          Grup Yükü:{" "}
          <span className={`font-medium ${group.interestEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {group.interestEnabled ? "Açık" : "Kapalı"}
          </span>
        </p>
      </div>

      {isManager && (
        <form action={toggleInterestEnabledAction.bind(null, group.id)} className="mt-3">
          <button
            className={
              group.interestEnabled
                ? "flex items-center gap-1.5 rounded-md border border-red-500/40 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
                : "flex items-center gap-1.5 rounded-md border border-emerald-500/40 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            }
          >
            {group.interestEnabled ? (
              <>
                <PauseCircle className="h-4 w-4" strokeWidth={1.75} />
                Grup Yükünü Kapat
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" strokeWidth={1.75} />
                Grup Yükünü Aç
              </>
            )}
          </button>
          <p className="mt-1 text-xs text-slate-500">
            Kapatıldığında yeni grup yükü işlenmez; daha önce oluşmuş grup yükü kayıtları
            korunur. Bazı gruplar bu özelliği hiç kullanmak istemeyebilir.
          </p>
        </form>
      )}

      {isManager && group.interestEnabled && (
        <InterestRateForm groupId={group.id} currentRate={group.monthlyInterestRate} />
      )}

      {isManager && (
        <ManualBalanceForm
          groupId={group.id}
          members={members.map((m) => ({ userId: m.userId, pharmacyName: m.user.pharmacyName ?? m.user.contactName }))}
        />
      )}

      {isManager && (
        <form action={yearEndSettlementAction.bind(null, group.id)} className="mt-4">
          <button className="flex items-center gap-1.5 rounded-md border border-amber-500/40 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/10">
            <RefreshCcw className="h-4 w-4" strokeWidth={1.75} />
            Yıl Sonu: Grup Yükünü Bakiyeye Ekle ve Sıfırla
          </button>
          <p className="mt-1 text-xs text-slate-500">
            Herkesin o anki grup yükü, bakiyesine tek seferlik eklenir ve grup yükü sıfırdan
            başlar. Geçmiş kayıtlar silinmez, sadece yeni bir "Yıl Sonu Mahsuplaşması" hareketi
            eklenir.
          </p>
        </form>
      )}

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
