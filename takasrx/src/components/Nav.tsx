import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";

type NavUser = { email: string; pharmacyName: string } | null;

export default function Nav({ user }: { user: NavUser }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-emerald-700">
          TakasRX
        </Link>

        {user ? (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
              Panelim
            </Link>
            <Link href="/groups" className="text-slate-600 hover:text-slate-900">
              Gruplar
            </Link>
            <span className="text-slate-400">{user.pharmacyName}</span>
            <form action={logoutAction}>
              <button className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100">
                Çıkış
              </button>
            </form>
          </nav>
        ) : (
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/login" className="text-slate-600 hover:text-slate-900">
              Giriş Yap
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
            >
              Üye Ol
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
