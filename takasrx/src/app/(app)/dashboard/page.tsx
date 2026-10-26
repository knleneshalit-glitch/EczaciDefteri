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
  TrendingUp,
  Star,
  BellRing,
  Sparkles,
  ShoppingCart,
  Banknote,
  Truck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { getEarnings, alimKazancYuzde, grupKazancYuzde, toplamKazanc, type EarningsSummary } from "@/lib/earnings";
import { istanbulDateKey, istanbulDayStartFromKey } from "@/lib/dates";
import PeriodPicker from "@/components/PeriodPicker";
import AnnouncementsPanel from "@/components/AnnouncementsPanel";
import CariOzetiPager from "@/components/CariOzetiPager";
import HelpTip from "@/components/HelpTip";
import { findFavoriteMatches } from "@/lib/favorite-matches";
import { effectiveUnitPrice } from "@/lib/pricing";

function EarningsTile({
  label,
  value,
  help,
  chip,
  Icon,
  tone,
}: {
  label: string;
  value: number;
  help: string;
  chip?: string;
  Icon: LucideIcon;
  tone: "emerald" | "blue" | "slate";
}) {
  const TONES = {
    emerald: "border-emerald-500/30 bg-emerald-500/5",
    blue: "border-blue-500/30 bg-blue-500/5",
    slate: "border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/40",
  };
  const CHIP = {
    emerald: "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    blue: "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    slate: "border-slate-400/50 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  };
  return (
    <div className={`relative flex gap-3 rounded-xl border p-2.5 sm:p-3 ${TONES[tone]}`}>
      <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm sm:flex">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="pr-4 text-[11px] font-semibold leading-tight text-emerald-800 dark:text-emerald-300">{label}</p>
        <p className="mt-0.5 whitespace-nowrap text-base font-extrabold text-slate-900 dark:text-slate-100 sm:text-lg">
          {value.toFixed(2)} ₺
        </p>
        {chip && (
          <span className={`mt-0.5 inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase leading-tight ${CHIP[tone]}`}>
            {chip}
          </span>
        )}
      </div>
      <HelpTip text={help} />
    </div>
  );
}

function EarningsCard({
  title,
  picker,
  earnings,
}: {
  title: string;
  picker: React.ReactNode;
  earnings: EarningsSummary;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {picker}
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 sm:px-4 sm:py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          <TrendingUp className="h-4 w-4 shrink-0" strokeWidth={2} />
          Toplam TakasRX Kazancım
        </span>
        <span className="whitespace-nowrap text-lg font-extrabold text-emerald-700 dark:text-emerald-400 sm:text-xl">
          {toplamKazanc(earnings).toFixed(2)} ₺
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
        <EarningsTile
          label="Alımlarımdan Kazancım"
          value={earnings.alimKazanci}
          chip={`%${alimKazancYuzde(earnings).toFixed(2)} kazancım`}
          help="Depo fiyatıyla alsaydınız ödeyeceğiniz tutar ile gruptan ödediğiniz net tutar arasındaki fark. İskonto/MF içermeyen teklifler ve Bakiye Transferi yüzdeye yansımaz."
          Icon={Sparkles}
          tone="emerald"
        />
        <EarningsTile
          label="Grubumun Kazancı"
          value={earnings.grupKazanci}
          chip={`%${grupKazancYuzde(earnings).toFixed(2)} grup kazancı`}
          help="Üye olduğunuz gruplardaki tüm eczanelerin alımlarından sağladığı toplam kazanç."
          Icon={Users}
          tone="blue"
        />
        <EarningsTile
          label="Benim Toplam Alımım"
          value={earnings.alimTutari}
          help="Seçilen dönemde gruplardan yaptığınız alımların net toplamı."
          Icon={ShoppingCart}
          tone="slate"
        />
        <EarningsTile
          label="Grubumun Toplam Alımı"
          value={earnings.grupToplamAlim}
          help="Gruplarınızdaki tüm eczanelerin seçilen dönemdeki alımlarının toplamı."
          Icon={Users}
          tone="slate"
        />
        <EarningsTile
          label="Stoğa Bağlamadığım Nakit"
          value={earnings.stogaBaglanmayanNakit}
          chip={`${earnings.valorKazanci.toFixed(2)} ₺ valör kazancı`}
          help="Aynı fiyatı tek başınıza yakalamak için depo şartının tamamını almanız gerekirdi. İhtiyacınız kadar alarak rafa bağlamadığınız tutar. Valör kazancı bu nakdin grubun aylık faiz oranıyla bir aylık finansman değeridir."
          Icon={Banknote}
          tone="emerald"
        />
        <EarningsTile
          label="Grubumun Stok Valör Kazancı"
          value={earnings.grupValorKazanci}
          help="Gruplarınızdaki tüm eczanelerin stoğa bağlamadığı nakdin finansman değeri."
          Icon={Wallet}
          tone="blue"
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  Icon,
  accent,
  highlight,
}: {
  label: string;
  value: string | number;
  href: string;
  Icon: LucideIcon;
  accent?: "emerald" | "amber" | "red" | "blue" | "purple" | "orange" | "slate";
  highlight?: string;
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
  const valueLength = String(value).length;
  const valueSizeClass =
    valueLength > 8
      ? "text-base sm:text-lg"
      : valueLength > 6
        ? "text-lg sm:text-xl"
        : "text-2xl sm:text-3xl";

  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-xl border p-3 shadow-sm hover:shadow-md transition sm:p-5 ${
        highlight
          ? "border-amber-400 bg-amber-50 dark:border-amber-500/60 dark:bg-amber-500/10"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`min-w-0 flex-1 whitespace-nowrap font-bold leading-tight ${valueSizeClass} ${color}`}>
          {value}
        </p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11 ${badgeBg} ${color}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.75} />
        </span>
      </div>
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500 break-words sm:text-sm">{label}</p>
      {highlight && (
        <p className="mt-0.5 text-[11px] font-bold uppercase text-amber-700 dark:text-amber-400 sm:text-xs">{highlight}</p>
      )}
      <span className="mt-auto hidden items-center gap-0.5 pt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 opacity-0 transition group-hover:opacity-100 sm:flex">
        Tümünü Görüntüle
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
    </Link>
  );
}

function monthKey(year: number, month: number) {
  const d = new Date(Date.UTC(year, month - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const user = await requireUser();
  const sp = await props.searchParams;

  const [memberships, openListingsCount, receivedPendingCount, sentPendingCount, ledgerEntries, announcements] =
    await Promise.all([
      prisma.groupMember.findMany({
        where: { userId: user.id },
        include: { group: true },
        orderBy: { joinedAt: "desc" },
      }),
      prisma.listing.count({ where: { userId: user.id, status: "OPEN" } }),
      prisma.offer.count({ where: { listing: { userId: user.id, listingKind: "STOK" }, status: "PENDING" } }),
      prisma.offer.count({ where: { userId: user.id, status: "PENDING" } }),
      prisma.ledgerEntry.findMany({
        where: { userId: user.id },
        select: { type: true, amount: true },
      }),
      prisma.announcement.findMany({
        where: { active: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  const approved = memberships.filter((m) => m.status === "APPROVED");
  const pending = memberships.filter((m) => m.status === "PENDING");
  const groupIds = approved.map((m) => m.groupId);
  const marketListingsCount = user.isSuperAdmin
    ? await prisma.listing.count({ where: { status: "OPEN" } })
    : await prisma.listing.count({ where: { status: "OPEN", groupId: { in: groupIds } } });

  const pendingShipmentsCount = await prisma.offer.count({
    where: {
      listing: { userId: user.id },
      status: "ACCEPTED",
      OR: [{ shipment: null }, { shipment: { printedAt: null } }],
    },
  });

  const groupLedgerEntries = groupIds.length
    ? await prisma.ledgerEntry.findMany({
        where: { groupId: { in: groupIds } },
        select: { type: true, amount: true },
      })
    : [];

  function computeCari(entries: { type: string; amount: number }[]) {
    const bakiye = entries
      .filter((e) => e.type !== "INTEREST")
      .reduce((sum, e) => sum + e.amount, 0);
    const grupYuku = entries
      .filter((e) => e.type === "INTEREST")
      .reduce((sum, e) => sum + e.amount, 0);
    const toplamAlim = entries
      .filter((e) => e.type === "TRADE" && e.amount < 0)
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);
    const toplamSatis = entries
      .filter((e) => e.type === "TRADE" && e.amount > 0)
      .reduce((sum, e) => sum + e.amount, 0);
    return { bakiye, grupYuku, toplamCari: bakiye + grupYuku, toplamAlim, toplamSatis };
  }

  const personalCari = computeCari(ledgerEntries);
  const groupCari = computeCari(groupLedgerEntries);
  const { toplamCari } = personalCari;

  const favorites = await prisma.favoriteProduct.findMany({
    where: { userId: user.id },
    select: { medicineName: true, barkod: true },
  });
  const favoriteMatches = (await findFavoriteMatches(user.id, favorites)).slice(0, 5);

  const [todayY, todayM] = istanbulDateKey(new Date()).split("-").map(Number);
  const monthOptions = Array.from({ length: 12 }, (_, i) => monthKey(todayY, todayM - i));
  const yearOptions = [todayY, todayY - 1, todayY - 2].map(String);
  const selectedMonth = typeof sp.ay === "string" && monthOptions.includes(sp.ay) ? sp.ay : monthOptions[0];
  const selectedYear = typeof sp.yil === "string" && yearOptions.includes(sp.yil) ? sp.yil : yearOptions[0];
  const [selY, selM] = selectedMonth.split("-").map(Number);
  const [monthEarnings, yearEarnings] = await Promise.all([
    getEarnings(user.id, groupIds, {
      from: istanbulDayStartFromKey(`${selectedMonth}-01`),
      to: istanbulDayStartFromKey(`${monthKey(selY, selM + 1)}-01`),
    }),
    getEarnings(user.id, groupIds, {
      from: istanbulDayStartFromKey(`${selectedYear}-01-01`),
      to: istanbulDayStartFromKey(`${Number(selectedYear) + 1}-01-01`),
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent sm:text-3xl">
            Ana Sayfa
          </h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {user.pharmacyName} · {user.region}
          </p>
        </div>
        <Link
          href="/groups?tab=kesfet"
          className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Search className="h-4 w-4" strokeWidth={1.75} />
          Grupları Keşfet
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
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
          label="Bekleyen Teklifler"
          value={receivedPendingCount}
          href="/offers/received"
          Icon={Inbox}
          accent="purple"
          highlight={receivedPendingCount > 0 ? "Bekleyen teklifiniz var" : undefined}
        />
        <StatCard
          label="Bekleyen Gönderimler"
          value={pendingShipmentsCount}
          href="/offers/received"
          Icon={Truck}
          accent="blue"
          highlight={pendingShipmentsCount > 0 ? "Gönderilmeyi bekliyor" : undefined}
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

      <section className="mt-6 rounded-2xl border border-emerald-500/30 sm:mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-[15px] bg-gradient-to-r from-emerald-700 to-emerald-600 px-4 py-3 text-white sm:px-5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <TrendingUp className="h-5 w-5" strokeWidth={2} />
            Kazancım
          </h2>
          <span className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-bold">
            BAKİYEM
            <span className={toplamCari < 0 ? "text-red-200" : "text-white"}>{toplamCari.toFixed(2)} ₺</span>
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 bg-slate-50 p-2 dark:bg-slate-950/40 sm:gap-4 sm:p-4 xl:grid-cols-2">
          <EarningsCard
            title={`${monthLabel(selectedMonth)} Ayı Kazanç Bilgileri`}
            earnings={monthEarnings}
            picker={
              <PeriodPicker
                param="ay"
                value={selectedMonth}
                options={monthOptions.map((m) => ({ value: m, label: monthLabel(m) }))}
                otherParams={{ yil: selectedYear }}
              />
            }
          />
          <EarningsCard
            title={`${selectedYear} Yılı Kazanç Bilgileri`}
            earnings={yearEarnings}
            picker={
              <PeriodPicker
                param="yil"
                value={selectedYear}
                options={yearOptions.map((y) => ({ value: y, label: y }))}
                otherParams={{ ay: selectedMonth }}
              />
            }
          />
        </div>
        <p className="rounded-b-[15px] border-t border-emerald-500/20 bg-amber-50 dark:bg-amber-500/5 px-4 py-2 text-[11px] text-amber-800 dark:text-amber-300 sm:px-5">
          Herhangi bir iskonto/MF içermeyen tekliflerden yapılan alımlar yüzdelik kazanç hesabına
          yansımaz. Bakiye transferi teklifleri de kazanç hesabına yansımaz.
        </p>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-8 sm:mt-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <section>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
              Gruplarım
            </h2>
            {approved.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Henüz onaylı bir gruba üye değilsiniz.{" "}
                <Link href="/groups?tab=kesfet" className="text-emerald-600 dark:text-emerald-400 hover:underline">
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

          <section className="mt-6">
            <h2 className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <span className="flex items-center gap-2">
                <BellRing className="h-3.5 w-3.5 text-amber-500" strokeWidth={1.75} />
                Ürün Bildirimleri
              </span>
              <Link href="/favorites" className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline">
                <Star className="h-3 w-3" strokeWidth={2} />
                Favori Ürünlerim
              </Link>
            </h2>
            <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              {favorites.length === 0 ? (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Takip etmek istediğiniz ürünleri{" "}
                  <Link href="/favorites" className="font-semibold text-amber-700 dark:text-amber-400 hover:underline">
                    favorilerinize ekleyin
                  </Link>
                  ; gruba çıktıklarında burada ve bildirimlerde görünür.
                </p>
              ) : favoriteMatches.length === 0 ? (
                <p className="text-xs text-slate-600 dark:text-slate-400">Bildirim bulunmamaktadır.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {favoriteMatches.map((l) => {
                    const net = effectiveUnitPrice(l);
                    return (
                      <li key={l.id}>
                        <Link
                          href={`/groups/${l.groupId}/listings/${l.id}`}
                          className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs hover:bg-amber-500/10"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-slate-900 dark:text-slate-100">{l.medicineName}</span>
                            <span className="block truncate text-slate-500">
                              {l.user.pharmacyName ?? l.user.contactName} · {l.group.name}
                            </span>
                          </span>
                          <span className="shrink-0 font-bold text-emerald-600 dark:text-emerald-400">
                            {net != null ? `${net.toFixed(2)} ₺` : ""}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {announcements.length > 0 && (
            <section className="mt-6">
              <AnnouncementsPanel announcements={announcements} />
            </section>
          )}

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
          <div className="mt-3">
            <CariOzetiPager personal={personalCari} group={groupCari} />
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
