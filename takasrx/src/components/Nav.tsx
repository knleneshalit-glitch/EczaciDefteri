import Link from "next/link";

export default function Nav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-emerald-700">
          TakasRX
        </Link>

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
      </div>
    </header>
  );
}
