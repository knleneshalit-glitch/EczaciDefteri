import Link from "next/link";
import { ShieldCheck, Users, Building2, Truck, ArrowRight, Lock, Wallet, Megaphone, X, Pill } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-user";
import { deactivateAnnouncementAction } from "@/app/actions/announcements";
import AnnouncementForm from "@/components/AnnouncementForm";
import ImportMedicinesButton from "@/components/ImportMedicinesButton";

export default async function AdminPage() {
  await requireSuperAdmin();

  const [groups, pharmacyCount, courierCount, groupCount, announcements, medicineCount] = await Promise.all([
    prisma.group.findMany({
      include: { _count: { select: { members: true, listings: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where: { accountType: "PHARMACY" } }),
    prisma.user.count({ where: { accountType: "COURIER" } }),
    prisma.group.count(),
    prisma.announcement.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } }),
    prisma.medicine.count(),
  ]);

  const stats = [
    { label: "Toplam Eczane", value: pharmacyCount, Icon: Building2, color: "blue" },
    { label: "Toplam Sevkiyatçı", value: courierCount, Icon: Truck, color: "orange" },
    { label: "Toplam Grup", value: groupCount, Icon: Users, color: "purple" },
  ] as const;

  const STAT_COLORS: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    purple: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  };

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
        {stats.map(({ label, value, Icon, color }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${STAT_COLORS[color]}`}>
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

      <h2 className="mt-10 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <Megaphone className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
        Duyurular
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Burada yayınladığınız duyurular tüm kullanıcıların Ana Sayfa ekranında görünür.
      </p>
      <AnnouncementForm />

      {announcements.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {announcements.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm"
            >
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">{a.title}</p>
                <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400/80">{a.body}</p>
              </div>
              <form action={deactivateAnnouncementAction.bind(null, a.id)}>
                <button
                  className="flex items-center gap-1 rounded-md border border-amber-500/40 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                  title="Duyuruyu kaldır"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Kaldır
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <Pill className="h-4 w-4 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
        İlaç / Barkod Veritabanı
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Kayıtlı {medicineCount} ilaç barkod eşleşmesi var. Yüklediğiniz barkod listesini içe
        aktarınca ilan oluşturma sayfasında ilaç adı/barkod otomatik tamamlama olarak kullanılır.
      </p>
      <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <ImportMedicinesButton />
      </div>
    </div>
  );
}
