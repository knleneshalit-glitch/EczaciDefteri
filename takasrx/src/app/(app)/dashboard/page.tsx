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
  ArrowDownCircle,
  ArrowUpCircle,
  Scale,
  ChevronRight,
  ShoppingBag,
  Megaphone,
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
  accent?: "emerald" | "amber" | "red" | "blue" | "purple" | "orange" | "slate";
}) {
  const COLORS: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-violet-600 dark:text-violet-400",
    orange: "text-orange-600 dark:text-orange-400",
    slate: "text-slate-900 dark:text-slate-100",
  };
  const BADGES: Record<string, string> = {
    emerald: "bg-emerald-500/10",
    amber: "bg-amber-500/10",
    red: "bg-red-500/10",
    blue: "bg-blue-500/10",
    purple: "bg-violet-500/10",
    orange: "bg-orange-500/10",
    slate: "bg-slate-500/10",
  };
  const color = COLORS[accent ?? "slate"];
  const badgeBg = BADGES[accent ?? "slate"];

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:border-emerald-400 hover:shadow-md transition"
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`min-w-0 flex-1 break-words text-3xl font-bold leading-tight ${color}`}>{value}</p>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${badgeBg} ${color}`}>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
      </div>
      <p className="mt-2 text-sm font-medium uppercase tracking-wide text-slate-500 break-words">{label}</p>
      <span className="mt-auto flex items-center gap-0.5 pt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 opacity-0 transition group-hover:opacity-100">
        Tümünü Görüntüle
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
    </Link>
  );
}

function CariRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "positive" | "negative" | "neutral";
}) {
  const valueColor =
    highlight === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : highlight === "negative"
        ? "text-red-600 dark:text-red-400"
        : "text-slate-900 dark:text-slate-100";
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-4 py-3 ${
        highlight ? "bg-slate-100 dark:bg-slate-800/60" : ""
      }`}
    >
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      <span className={`text-base font-bold ${valueColor}`}>{value}</span>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();

  const [memberships, openListingsCount, receivedPendingCount, sentPendingCount, ledgerEntries, announcements] =
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
      prisma.announcement.findMany({
        where: { active: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const approved = memberships.filter((m) => m.status === "APPROVED");
  const pending = memberships.filter((m) => m.status === "PENDING");
  const groupIds = approved.map((m) => m.groupId);
  const marketListingsCount = user.isSuperAdmin
    ? await prisma.listing.count({ where: { status: "OPEN" } })
    : await prisma.listing.count({ where: { status: "OPEN", groupId: { in: groupIds } } });

  const bakiye = ledgerEntries
    .filter((e) => e.type !== "INTEREST")
    .reduce((sum, e) => sum + e.amount, 0);
  const grupYuku = ledgerEntries
    .filter((e) => e.type === "INTEREST")
    .reduce((sum, e) => sum + e.amount, 0);
  const toplamCari = bakiye + grupYuku;
  const toplamAlim = ledgerEntries
    .filter((e) => e.type === "TRADE" && e.amount < 0)
    .reduce((sum, e) => sum + Math.abs(e.amount), 0);
  const toplamSatis = ledgerEntries
    .filter((e) => e.type === "TRADE" && e.amount > 0)
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
            Ana Sayfa
          </h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
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

      {announcements.length > 0 && (
        <div className="mt-6 flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          {announcements.map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <Megaphone className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">{a.title}</p>
                <p className="text-sm text-amber-800/80 dark:text-amber-400/80">{a.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Gruptaki Aktif Teklifler"
          value={marketListingsCount}
          href="/market"
          Icon={ShoppingBag}
          accent="amber"
        />
        <StatCard
          label="Aktif Tekliflerim"
          value={openListingsCount}
          href="/listings"
          Icon={PackageOpen}
          accent="blue"
        />
        <StatCard
          label="Gönderimlerim"
          value={receivedPendingCount}
          href="/offers/received"
          Icon={Inbox}
          accent="purple"
        />
        <StatCard
          label="Alımlarım"
          value={sentPendingCount}
          href="/offers/sent"
          Icon={Send}
          accent="orange"
        />
        <StatCard
          label="Toplam Cari (Bakiye+Yük)"
          value={`${toplamCari.toFixed(2)} ₺`}
          href="/groups"
          Icon={Wallet}
          accent={toplamCari >= 0 ? "emerald" : "red"}
        />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <section>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
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

        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Scale className="h-4 w-4 text-teal-600 dark:text-teal-400" strokeWidth={1.75} />
            Genel Cari Özeti
          </h2>
          <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2">
            <CariRow
              label="Bakiye"
              value={`${bakiye.toFixed(2)} ₺`}
              highlight={bakiye >= 0 ? "positive" : "negative"}
            />
            <CariRow
              label="Grup Yükü"
              value={`${grupYuku.toFixed(2)} ₺`}
              highlight={grupYuku >= 0 ? "positive" : "negative"}
            />
            <CariRow label="Toplam" value={`${toplamCari.toFixed(2)} ₺`} highlight="neutral" />
            <CariRow label="Toplam Alım" value={`${toplamAlim.toFixed(2)} ₺`} />
            <CariRow label="Toplam Satış" value={`${toplamSatis.toFixed(2)} ₺`} />
          </div>
          <div className="mt-3 flex items-center gap-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-slate-600 dark:text-slate-400">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ArrowDownCircle className="h-4 w-4" strokeWidth={1.75} />
            </span>
            Alım: satın aldığınız ürünler ·
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ArrowUpCircle className="h-4 w-4" strokeWidth={1.75} />
            </span>
            Satış: sattığınız ürünler
          </div>
        </section>
      </div>
    </div>
  );
}
