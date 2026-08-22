import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { closeExpiredTargetListingsForGroups } from "@/lib/listings";
import MarketListings from "@/components/MarketListings";

export default async function MarketPage() {
  const user = await requireUser();

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id, status: "APPROVED" },
    select: { groupId: true },
  });
  const groupIds = memberships.map((m) => m.groupId);

  await closeExpiredTargetListingsForGroups(groupIds);

  const listings = user.isSuperAdmin
    ? await prisma.listing.findMany({
        where: { status: "OPEN" },
        include: {
          group: true,
          user: true,
          offers: { where: { status: "ACCEPTED" }, select: { quantity: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : await prisma.listing.findMany({
        where: {
          status: "OPEN",
          groupId: { in: groupIds },
          OR: [{ targetUserId: null }, { targetUserId: user.id }, { userId: user.id }],
        },
        include: {
          group: true,
          user: true,
          offers: { where: { status: "ACCEPTED" }, select: { quantity: true } },
        },
        orderBy: { createdAt: "desc" },
      });

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <ShoppingBag className="h-6 w-6 text-orange-500" strokeWidth={1.75} />
        Gruptaki Aktif Teklifler
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Üye olduğunuz tüm gruplardaki açık ilanlar tek sayfada.
      </p>

      {listings.length === 0 ? (
        <p className="mt-8 text-sm text-slate-600 dark:text-slate-400">
          Şu anda hiçbir grubunuzda açık ilan yok.{" "}
          <Link href="/groups" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            Gruplarınıza göz atın.
          </Link>
        </p>
      ) : (
        <MarketListings listings={listings} />
      )}
    </div>
  );
}
