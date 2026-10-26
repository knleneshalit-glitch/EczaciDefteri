import Link from "next/link";
import { FileSpreadsheet, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import ImportForm from "./ImportForm";

export default async function ImportListingsPage() {
  const user = await requireUser();
  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id, status: "APPROVED", group: { closedAt: null } },
    include: { group: { select: { id: true, name: true } } },
    orderBy: { group: { name: "asc" } },
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <Link href="/listings" className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:underline">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Talep Oluştur - Yönet
      </Link>
      <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <FileSpreadsheet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
        Excel&apos;den Teklif Aktar
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Stoğunuzdaki ürünleri tek seferde ilan olarak yayınlayın. Excel&apos;de hücreleri kopyalayıp
        aşağıya yapıştırabilir ya da CSV dosyası yükleyebilirsiniz.
      </p>
      {memberships.length === 0 ? (
        <p className="mt-8 text-sm text-slate-600 dark:text-slate-400">
          İlan aktarabilmek için önce bir gruba üye olun.{" "}
          <Link href="/groups?tab=kesfet" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            Gruplara katılın.
          </Link>
        </p>
      ) : (
        <ImportForm groups={memberships.map((m) => m.group)} />
      )}
    </div>
  );
}
