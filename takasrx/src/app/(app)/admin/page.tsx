import Link from "next/link";
import { ShieldCheck, Users, Building2, Truck, ArrowRight, Lock, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-user";

export default async function AdminPage() {
  await requireSuperAdmin();

  const [groups, pharmacyCount, courierCount, groupCount] = await Promise.all([
    prisma.group.findMany({
      include: { _count: { select: { members: true, listings: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where: { accountType: "PHARMACY" } }),
    prisma.user.count({ where: { accountType: "COURIER" } }),
    prisma.group.count(),
  ]);

  const stats = [
    { label: "Toplam Eczane", value: pharmacyCount, Icon: Building2 },
    { label: "Toplam Sevkiyatçı", value: courierCount, Icon: Truck },
    { label: "Toplam Grup", value: groupCount, Icon: Users },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Süper Admin Paneli
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Sistemdeki tüm gruplara, üye olmasanız bile yönetici yetkisiyle erişebilirsiniz — üye
        çıkarma, bakiye ekleme, grup kapatma, faiz oranı ve yıl sonu mahsuplaşma dahil.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, Icon }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <Users className="h-4 w-4 text-slate-600 dark:text-slate-400" strokeWidth={1.75} />
        Tüm Gruplar ({groups.length})
      </h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Grup Adı</th>
              <th className="px-4 py-3">Bölge</th>
              <th className="px-4 py-3">Üye</th>
              <th className="px-4 py-3">İlan</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} className="border-b border-slate-200 dark:border-slate-800/60 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{g.name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{g.region}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{g._count.members}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{g._count.listings}</td>
                <td className="px-4 py-3">
                  {g.closedAt ? (
                    <span className="flex w-fit items-center gap-1 rounded bg-red-500/10 px-2 py-0.5 text-xs text-red-600 dark:text-red-400">
                      <Lock className="h-3 w-3" strokeWidth={1.75} />
                      Kapalı
                    </span>
                  ) : (
                    <span className="flex w-fit items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                      Açık
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/groups/${g.id}/balances`}
                      className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      <Wallet className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Bakiyeler
                    </Link>
                    <Link
                      href={`/groups/${g.id}`}
                      className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Yönet
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Henüz grup yok
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
