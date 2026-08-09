import Link from "next/link";

export default function Nav() {
  return (
    <header className="border-b border-slate-800 bg-slate-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-emerald-400">
          TakasRX
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          <Link href="/login" className="text-slate-400 hover:text-slate-100">
            Giriş Yap
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-500"
          >
            Üye Ol
          </Link>
        </nav>
      </div>
    </header>
  );
}
