import Link from "next/link";
import { ArrowLeftRight, LogIn, UserPlus } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Nav() {
  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold text-emerald-600 dark:text-emerald-400"
        >
          <ArrowLeftRight className="h-5 w-5" strokeWidth={2.5} />
          TakasRX
        </Link>

        <nav className="flex items-center gap-2 text-sm sm:gap-3">
          <ThemeToggle
            labelClassName="hidden sm:inline"
            className="flex h-8 items-center gap-1.5 rounded-md border border-slate-300 px-2 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 sm:px-3"
          />
          <Link
            href="/login"
            className="flex items-center gap-1.5 whitespace-nowrap text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <LogIn className="h-4 w-4" strokeWidth={1.75} />
            Giriş Yap
          </Link>
          <Link
            href="/register"
            className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-500"
          >
            <UserPlus className="h-4 w-4" strokeWidth={1.75} />
            Üye Ol
          </Link>
        </nav>
      </div>
    </header>
  );
}
