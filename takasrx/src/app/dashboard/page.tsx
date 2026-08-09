import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export default async function DashboardPage() {
  const user = await requireUser();

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    include: { group: true },
    orderBy: { joinedAt: "desc" },
  });

  const approved = memberships.filter((m) => m.status === "APPROVED");
  const pending = memberships.filter((m) => m.status === "PENDING");

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panelim</h1>
          <p className="mt-1 text-sm text-slate-600">
            {user.pharmacyName} · {user.region}
          </p>
        </div>
        <Link
          href="/groups"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Grupları Keşfet
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">Gruplarım</h2>
        {approved.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            Henüz onaylı bir gruba üye değilsiniz.{" "}
            <Link href="/groups" className="text-emerald-700 hover:underline">
              Bölgenizdeki grupları keşfedin.
            </Link>
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {approved.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/groups/${m.group.id}`}
                  className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-emerald-400"
                >
                  <p className="font-medium text-slate-900">{m.group.name}</p>
                  <p className="text-sm text-slate-500">{m.group.region}</p>
                  {m.role === "MANAGER" && (
                    <span className="mt-2 inline-block rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
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
          <h2 className="text-lg font-semibold text-slate-900">
            Onay Bekleyen Katılım İstekleri
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {pending.map((m) => (
              <li
                key={m.id}
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
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
