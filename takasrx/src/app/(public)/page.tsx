import Link from "next/link";
import { MapPin, ShieldCheck, Zap } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl">
        Eczaneler arası ilaç takası, bölgenizdeki güvenilir grup içinde.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-slate-400">
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
          className="rounded-md border border-slate-700 px-6 py-3 font-medium text-slate-300 hover:bg-slate-800"
        >
          Giriş Yap
        </Link>
      </div>

      <div className="mt-20 grid max-w-3xl gap-8 text-left sm:grid-cols-3">
        <div>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <MapPin className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <h3 className="mt-3 font-semibold text-slate-100">Bölge Bazlı Gruplar</h3>
          <p className="mt-1 text-sm text-slate-400">
            İlinize ait takas grubuna katılın ya da yenisini kurun.
          </p>
        </div>
        <div>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <h3 className="mt-3 font-semibold text-slate-100">Sadece Üyelere Özel</h3>
          <p className="mt-1 text-sm text-slate-400">
            Takas ilanları yalnızca onaylı grup üyeleri tarafından görülür.
          </p>
        </div>
        <div>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Zap className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <h3 className="mt-3 font-semibold text-slate-100">Hızlı Teklif</h3>
          <p className="mt-1 text-sm text-slate-400">
            İlana doğrudan teklif verin, eczane sahibi kabul etsin.
          </p>
        </div>
      </div>
    </div>
  );
}
