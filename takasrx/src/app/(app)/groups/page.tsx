import Link from "next/link";
import {
  Users,
  Plus,
  CheckCircle2,
  Clock,
  Send,
  Search,
  UserPlus,
  Crown,
  Building2,
  Check,
  X,
  UserMinus,
  ArrowRight,
  Wallet,
  LogOut,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { REGIONS } from "@/lib/regions";
import { foldTr } from "@/lib/search";
import { telHref } from "@/lib/phone";
import {
  requestJoinAction,
  approveMemberAction,
  rejectMemberAction,
  removeMemberAction,
  setMemberRoleAction,
  leaveGroupAction,
} from "@/app/actions/groups";

const MEMBERSHIP_STATUS_LABEL: Record<string, string> = {
  APPROVED: "Üyelik Devam Ediyor",
  PENDING: "Onay Bekliyor",
  REJECTED: "Reddedildi",
};

const MEMBERSHIP_STATUS_CLASS: Record<string, string> = {
  APPROVED: "text-emerald-700 dark:text-emerald-400",
  PENDING: "text-amber-700 dark:text-amber-400",
  REJECTED: "text-red-700 dark:text-red-400",
};

function param(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function GroupsPage(props: PageProps<"/groups">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const tab = param(sp.tab) === "kesfet" ? "kesfet" : "gruplarim";

  const tabs = (
    <div className="mt-6 flex flex-wrap gap-2">
      <Link
        href="/groups"
        className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold ${
          tab === "gruplarim"
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-emerald-400"
        }`}
      >
        <Users className="h-4 w-4" strokeWidth={1.75} />
        Gruplarım
      </Link>
      <Link
        href="/groups?tab=kesfet"
        className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold ${
          tab === "kesfet"
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-emerald-400"
        }`}
      >
        <UserPlus className="h-4 w-4" strokeWidth={1.75} />
        Gruplara Katıl
      </Link>
    </div>
  );

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
          <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
          Grup Yönetimi
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Üye olduğunuz gruplar, üyelik durumlarınız ve grup üyeleri.
        </p>
      </div>
      <Link
        href="/groups/new"
        className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Grup Oluştur
      </Link>
    </div>
  );

  if (tab === "kesfet") {
    const region = param(sp.region);
    const selectedRegion = region || user.region;
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
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        {header}
        {tabs}
        <form className="mt-6 flex items-center gap-2">
          <input type="hidden" name="tab" value="kesfet" />
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

        <ul className="mt-6 flex max-w-3xl flex-col gap-3">
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

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    include: {
      group: {
        include: { _count: { select: { members: { where: { status: "APPROVED" } } } } },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const selectedGroupId =
    param(sp.g) && memberships.some((m) => m.groupId === param(sp.g))
      ? param(sp.g)
      : (memberships.find((m) => m.status === "APPROVED")?.groupId ?? null);
  const selectedMembership = memberships.find((m) => m.groupId === selectedGroupId) ?? null;
  const canSeeMembers = selectedMembership?.status === "APPROVED" || (user.isSuperAdmin && !!selectedMembership);
  const isManager =
    (selectedMembership?.role === "MANAGER" && selectedMembership.status === "APPROVED") || user.isSuperAdmin;

  const q = param(sp.q).trim();
  const members =
    selectedGroupId && canSeeMembers
      ? await prisma.groupMember.findMany({
          where: { groupId: selectedGroupId, ...(isManager ? {} : { status: "APPROVED" }) },
          include: { user: true },
          orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
        })
      : [];
  const statusOrder: Record<string, number> = { PENDING: 0, APPROVED: 1, REJECTED: 2 };
  const visibleMembers = members
    .filter((m) => !q || foldTr(m.user.pharmacyName ?? m.user.contactName).includes(foldTr(q)))
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  const selectedMember = members.find((m) => m.id === param(sp.m)) ?? null;

  const hrefFor = (params: Record<string, string | null>) => {
    const usp = new URLSearchParams();
    const merged = { g: selectedGroupId, q: q || null, m: selectedMember?.id ?? null, ...params };
    for (const [k, v] of Object.entries(merged)) if (v) usp.set(k, v);
    const s = usp.toString();
    return s ? `/groups?${s}` : "/groups";
  };

  const card = "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";
  const selectedGroup = selectedMembership?.group ?? null;

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      {header}
      {tabs}

      {memberships.length === 0 ? (
        <div className={`${card} mt-6 p-6 text-center sm:p-8`}>
          <p className="text-sm text-slate-600 dark:text-slate-400">Henüz bir gruba üye değilsiniz.</p>
          <Link
            href="/groups?tab=kesfet"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            <UserPlus className="h-4 w-4" strokeWidth={1.75} />
            Gruplara Katıl
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <section className={card}>
            <h2 className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Gruplarım ({memberships.length})
            </h2>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/60 uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Grup Adı</th>
                  <th className="px-3 py-2">Üyelik Tipi</th>
                  <th className="px-3 py-2">Üyelik Onay Durumu</th>
                  <th className="px-3 py-2">Bakiye Limit Durumu</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((m) => {
                  const active = m.groupId === selectedGroupId;
                  return (
                    <tr
                      key={m.id}
                      className={`border-t border-slate-200 dark:border-slate-800/60 ${
                        active ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <td className="px-3 py-2.5 font-semibold">
                        <Link href={`/groups?g=${m.groupId}`} className="block">
                          {m.group.name}
                          <span className={`block text-[11px] font-normal ${active ? "opacity-75" : "text-slate-500"}`}>
                            {m.group.region} · {m.group._count.members} üye
                            {m.group.closedAt ? " · Kapatıldı" : ""}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">{m.role === "MANAGER" ? "Grup Yöneticisi" : "Üye"}</td>
                      <td className={`px-3 py-2.5 font-medium ${active ? "" : MEMBERSHIP_STATUS_CLASS[m.status]}`}>
                        {MEMBERSHIP_STATUS_LABEL[m.status]}
                      </td>
                      <td className="px-3 py-2.5">
                        {m.group.balanceLimitEnabled ? (
                          <span className="font-medium">Bakiye Kısıtlaması Açık ({(m.group.balanceLimit ?? 0).toFixed(0)} ₺)</span>
                        ) : (
                          <span className={active ? "opacity-75" : "text-slate-500"}>Kısıtlama Yok</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {selectedGroup && (
              <div className="flex flex-wrap gap-2 border-t border-slate-200 dark:border-slate-800 p-3">
                <Link
                  href={`/groups/${selectedGroup.id}`}
                  className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Gruba Git
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                </Link>
                {selectedMembership?.status === "APPROVED" && (
                  <Link
                    href={`/groups/${selectedGroup.id}/balances`}
                    className="flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Wallet className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Grup Bakiyeleri
                  </Link>
                )}
                {selectedGroup.creatorId !== user.id && (
                  <form action={leaveGroupAction.bind(null, selectedGroup.id)}>
                    <button className="flex items-center gap-1 rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10">
                      <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Gruptan Ayrıl
                    </button>
                  </form>
                )}
              </div>
            )}
          </section>

          <section className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {selectedGroup ? `${selectedGroup.name} - Üyeler` : "Üyeler"}
              </h2>
              {canSeeMembers && (
                <form className="relative w-full max-w-[220px]">
                  {selectedGroupId && <input type="hidden" name="g" value={selectedGroupId} />}
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                    strokeWidth={1.75}
                  />
                  <input
                    name="q"
                    defaultValue={q}
                    placeholder="Eczane adı ara..."
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-1.5 pl-8 pr-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </form>
              )}
            </div>
            {!canSeeMembers ? (
              <p className="px-4 py-12 text-center text-sm text-slate-500">
                {selectedMembership?.status === "PENDING"
                  ? "Katılım isteğiniz onaylanınca grup üyelerini görebilirsiniz."
                  : "Üyeleri görmek için onaylı bir grup seçin."}
              </p>
            ) : (
              <>
                <div className="max-h-[420px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Eczane Adı</th>
                        <th className="px-3 py-2">Üyelik Tipi</th>
                        <th className="px-3 py-2">Üyelik Onay Durumu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleMembers.map((m) => (
                        <tr
                          key={m.id}
                          className={`border-t border-slate-200 dark:border-slate-800/60 ${
                            selectedMember?.id === m.id
                              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                              : m.role === "MANAGER"
                                ? "bg-emerald-50 dark:bg-emerald-500/10"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <td className="px-3 py-2 font-semibold">
                            <Link href={hrefFor({ m: m.id })} scroll={false} className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={1.75} />
                              {m.user.pharmacyName ?? m.user.contactName}
                              {m.userId === user.id && <span className="text-[10px] font-normal opacity-70">(siz)</span>}
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            {m.role === "MANAGER" ? (
                              <span className="flex items-center gap-1 font-medium">
                                <Crown className="h-3 w-3" strokeWidth={2} />
                                Grup Yöneticisi
                              </span>
                            ) : (
                              "Üye"
                            )}
                          </td>
                          <td className={`px-3 py-2 font-medium ${selectedMember?.id === m.id ? "" : MEMBERSHIP_STATUS_CLASS[m.status]}`}>
                            {MEMBERSHIP_STATUS_LABEL[m.status]}
                          </td>
                        </tr>
                      ))}
                      {visibleMembers.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-8 text-left sm:text-center text-slate-500">
                            Kayıt bulunamadı.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="border-t border-slate-200 dark:border-slate-800 px-4 py-2 text-[11px] text-slate-500">
                  Toplam {visibleMembers.length} kayıt · Eczane bilgilerini görmek için bir eczaneye tıklayın.
                </p>

                {selectedMember && (
                  <div className="border-t border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Eczane Bilgileri</p>
                    <dl className="mt-2 grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-slate-500">Eczane</dt>
                        <dd className="font-semibold text-slate-900 dark:text-slate-100">
                          {selectedMember.user.pharmacyName ?? selectedMember.user.contactName}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">GLN</dt>
                        <dd className="text-slate-800 dark:text-slate-200">{selectedMember.user.gln ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Yönetici / Yetkili</dt>
                        <dd className="text-slate-800 dark:text-slate-200">{selectedMember.user.contactName}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">E-posta</dt>
                        <dd className="break-all text-slate-800 dark:text-slate-200">{selectedMember.user.email}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Telefon</dt>
                        <dd className="text-slate-800 dark:text-slate-200">
                          {selectedMember.user.phone ? (
                            <a href={telHref(selectedMember.user.phone)} className="text-emerald-600 dark:text-emerald-400 underline">
                              {selectedMember.user.phone}
                            </a>
                          ) : (
                            "—"
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Şehir</dt>
                        <dd className="text-slate-800 dark:text-slate-200">
                          {selectedMember.user.region}
                          {selectedMember.user.district ? ` / ${selectedMember.user.district}` : ""}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-slate-500">Adres</dt>
                        <dd className="text-slate-800 dark:text-slate-200">{selectedMember.user.address ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Katılım</dt>
                        <dd className="text-slate-800 dark:text-slate-200">
                          {selectedMember.joinedAt.toLocaleDateString("tr-TR")}
                        </dd>
                      </div>
                    </dl>

                    {isManager && selectedGroup && selectedMember.userId !== user.id && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedMember.status === "PENDING" && (
                          <>
                            <form action={approveMemberAction.bind(null, selectedGroup.id, selectedMember.id)}>
                              <button className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">
                                <Check className="h-3.5 w-3.5" strokeWidth={2} />
                                Onayla
                              </button>
                            </form>
                            <form action={rejectMemberAction.bind(null, selectedGroup.id, selectedMember.id)}>
                              <button className="flex items-center gap-1 rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10">
                                <X className="h-3.5 w-3.5" strokeWidth={2} />
                                Reddet
                              </button>
                            </form>
                          </>
                        )}
                        {selectedMember.status === "APPROVED" &&
                          (selectedMember.role === "MANAGER" ? (
                            selectedMember.userId !== selectedGroup.creatorId && (
                              <form action={setMemberRoleAction.bind(null, selectedGroup.id, selectedMember.id, "MEMBER")}>
                                <button className="flex items-center gap-1 rounded-md border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-500/10">
                                  <ShieldOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                                  Yöneticiliği Kaldır
                                </button>
                              </form>
                            )
                          ) : (
                            <form action={setMemberRoleAction.bind(null, selectedGroup.id, selectedMember.id, "MANAGER")}>
                              <button className="flex items-center gap-1 rounded-md border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10">
                                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                                Grup Yöneticisi Yap
                              </button>
                            </form>
                          ))}
                        {selectedMember.status === "APPROVED" &&
                          selectedMember.role !== "MANAGER" &&
                          selectedMember.userId !== selectedGroup.creatorId && (
                            <form action={removeMemberAction.bind(null, selectedGroup.id, selectedMember.id)}>
                              <button className="flex items-center gap-1 rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10">
                                <UserMinus className="h-3.5 w-3.5" strokeWidth={1.75} />
                                Gruptan Çıkar
                              </button>
                            </form>
                          )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
