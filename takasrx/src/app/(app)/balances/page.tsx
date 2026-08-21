import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export default async function BalancesRedirectPage() {
  const user = await requireUser();

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id, status: "APPROVED" },
    include: { group: true },
    orderBy: { joinedAt: "desc" },
  });

  if (memberships.length === 1) {
    redirect(`/groups/${memberships[0].groupId}/balances`);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Grup Bakiyeleri
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Bakiyelerini görmek istediğiniz grubu seçin.
      </p>

      {memberships.length === 0 ? (
        <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
          Henüz onaylı bir gruba üye değilsiniz.{" "}
          <Link href="/groups" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            Bölgenizdeki grupları keşfedin.
          </Link>
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {memberships.map((m) => (
            <li key={m.id}>
              <Link
                href={`/groups/${m.groupId}/balances`}
                className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-emerald-500"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{m.group.name}</p>
                  <p className="text-sm text-slate-500">{m.group.region}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
