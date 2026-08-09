import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Search,
  PackageOpen,
  Inbox,
  Send,
  Wallet,
  Users,
  Clock,
  Crown,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

function StatCard({
  label,
  value,
  href,
  Icon,
  accent,
}: {
  label: string;
  value: string | number;
  href: string;
  Icon: LucideIcon;
  accent?: "emerald" | "amber" | "red" | "slate";
}) {
  const color =
    accent === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : accent === "red"
        ? "text-red-600 dark:text-red-400"
        : accent === "emerald"
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-slate-900 dark:text-slate-100";
  const badgeBg =
    accent === "amber"
      ? "bg-amber-500/10"
      : accent === "red"
        ? "bg-red-500/10"
        : "bg-emerald-500/10";

  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-emerald-400"
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${badgeBg} ${color}`}>
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <p className={`mt-3 text-3xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();

  const [memberships, openListingsCount, receivedPendingCount, sentPendingCount, ledgerEntries] =
    await Promise.all([
      prisma.groupMember.findMany({
        where: { userId: user.id },
        include: { group: true },
        orderBy: { joinedAt: "desc" },
      }),
      prisma.listing.count({ where: { userId: user.id, status: "OPEN" } }),
      prisma.offer.count({ where: { listing: { userId: user.id }, status: "PENDING" } }),
      prisma.offer.count({ where: { userId: user.id, status: "PENDING" } }),
      prisma.ledgerEntry.findMany({
        where: { userId: user.id },
        select: { type: true, amount: true },
      }),
    ]);

  const approved = memberships.filter((m) => m.status === "APPROVED");
  const pending = memberships.filter((m) => m.status === "PENDING");

  const bakiye = ledgerEntries
    .filter((e) => e.type !== "INTEREST")
    .reduce((sum, e) => sum + e.amount, 0);
  const grupYuku = ledgerEntries
    .filter((e) => e.type === "INTEREST")
    .reduce((sum, e) => sum + e.amount, 0);
  const toplamCari = bakiye + grupYuku;

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Ana Sayfa</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {user.pharmacyName} · {user.region}
          </p>
        </div>
        <Link
          href="/groups"
          className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Search className="h-4 w-4" strokeWidth={1.75} />
          Grupları Keşfet
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Açık İlanlarım"
          value={openListingsCount}
          href="/listings"
          Icon={PackageOpen}
          accent="emerald"
        />
        <StatCard
          label="Gelen Bekleyen Teklif"
          value={receivedPendingCount}
          href="/offers/received"
          Icon={Inbox}
          accent="amber"
        />
        <StatCard
          label="Gönderdiğim Bekleyen Teklif"
          value={sentPendingCount}
          href="/offers/sent"
          Icon={Send}
          accent="amber"
        />
        <StatCard
          label="Toplam Cari (Bakiye+Yük)"
          value={`${toplamCari.toFixed(2)} ₺`}
          href="/groups"
          Icon={Wallet}
          accent={toplamCari >= 0 ? "emerald" : "red"}
        />
      </div>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          <Users className="h-4 w-4 text-slate-600 dark:text-slate-400" strokeWidth={1.75} />
          Gruplarım
        </h2>
        {approved.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Henüz onaylı bir gruba üye değilsiniz.{" "}
            <Link href="/groups" className="text-emerald-600 dark:text-emerald-400 hover:underline">
              Bölgenizdeki grupları keşfedin.
            </Link>
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {approved.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/groups/${m.group.id}`}
                  className="block rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-emerald-500"
                >
                  <p className="font-medium text-slate-900 dark:text-slate-100">{m.group.name}</p>
                  <p className="text-sm text-slate-500">{m.group.region}</p>
                  {m.role === "MANAGER" && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <Crown className="h-3 w-3" strokeWidth={1.75} />
                      Yönetici
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pending.length > 0 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
            Onay Bekleyen Katılım İstekleri
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {pending.map((m) => (
              <li
                key={m.id}
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300"
              >
                <span className="font-medium">{m.group.name}</span> —
                katılım isteğiniz grup yöneticisinin onayını bekliyor.
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
