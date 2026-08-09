import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        Eczaneler arası ilaç takası, bölgenizdeki güvenilir grup içinde.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-slate-600">
        TakasRX&apos;te bölgenizdeki takas grubuna katılın, sadece o gruba üye
        eczacıların paylaştığı takas tekliflerini görün ve teklif verin.
      </p>
      <div className="mt-10 flex gap-4">
        <Link
          href="/register"
          className="rounded-md bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700"
        >
          Hemen Üye Ol
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-100"
        >
          Giriş Yap
        </Link>
      </div>

      <div className="mt-20 grid max-w-3xl gap-8 text-left sm:grid-cols-3">
        <div>
          <h3 className="font-semibold text-slate-900">Bölge Bazlı Gruplar</h3>
          <p className="mt-1 text-sm text-slate-600">
            İlinize ait takas grubuna katılın ya da yenisini kurun.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Sadece Üyelere Özel</h3>
          <p className="mt-1 text-sm text-slate-600">
            Takas ilanları yalnızca onaylı grup üyeleri tarafından görülür.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Hızlı Teklif</h3>
          <p className="mt-1 text-sm text-slate-600">
            İlana doğrudan teklif verin, eczane sahibi kabul etsin.
          </p>
        </div>
      </div>
    </div>
  );
}
