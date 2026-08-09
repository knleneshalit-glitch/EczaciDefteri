import Link from "next/link";
import { Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export default async function LedgerPage() {
  const user = await requireUser();

  const offers = await prisma.offer.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ userId: user.id }, { listing: { userId: user.id } }],
    },
    include: { listing: { include: { group: true, user: true } }, user: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
        <Wallet className="h-6 w-6 text-emerald-400" strokeWidth={1.75} />
        Cari Hareketler
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Tamamlanan alım ve satış hareketleriniz (ürün gönderimleri).
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-800/40 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3">Yön</th>
              <th className="px-4 py-3">Ürün Adı</th>
              <th className="px-4 py-3">Grup</th>
              <th className="px-4 py-3">Net Fiyat</th>
              <th className="px-4 py-3">Depo Fiyatı</th>
              <th className="px-4 py-3">Alım Şartı</th>
              <th className="px-4 py-3">Toplam Dağıtılan</th>
              <th className="px-4 py-3">Toplam Fiyat</th>
              <th className="px-4 py-3">S.K.T.</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => {
              const isBuyer = o.userId === user.id;
              return (
                <tr key={o.id} className="border-b border-slate-800/60 last:border-0">
                  <td className="px-4 py-3 text-slate-400">
                    {o.createdAt.toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`flex w-fit items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                        isBuyer
                          ? "bg-red-500/10 text-red-400"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {isBuyer ? (
                        <ArrowDownCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                      ) : (
                        <ArrowUpCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                      )}
                      {isBuyer ? "Alım" : "Satış"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-100">
                    {o.listing.title}
                    <p className="text-xs font-normal text-slate-500">
                      {o.listing.medicineName}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    <Link
                      href={`/groups/${o.listing.groupId}`}
                      className="hover:text-emerald-400 hover:underline"
                    >
                      {o.listing.group.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {o.unitPrice != null ? `${o.unitPrice.toFixed(2)} ₺` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {o.listing.birimFiyat != null
                      ? `${o.listing.birimFiyat.toFixed(2)} ₺`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {o.quantity}
                    {o.bonusQuantity ? `+${o.bonusQuantity}` : "+0"}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{o.quantity}</td>
                  <td className="px-4 py-3 font-medium text-slate-100">
                    {o.totalPrice != null ? `${o.totalPrice.toFixed(2)} ₺` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {o.listing.expiryDate
                      ? o.listing.expiryDate.toLocaleDateString("tr-TR")
                      : "—"}
                  </td>
                </tr>
              );
            })}
            {offers.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-slate-500">
                  Kayıt bulunamadı
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
