"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Yan menü bağlantısı: bulunulan sayfada `data-active` alır. `matchTab`
 * verilirse aynı sayfadaki `?tab=` sekmeleri de ayırt edilir.
 */
export default function NavLink({
  href,
  title,
  className,
  matchTab = false,
  children,
}: {
  href: string;
  title?: string;
  className?: string;
  matchTab?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [path, query = ""] = href.split("?");
  const onPath = pathname === path || pathname.startsWith(`${path}/`);
  const active = matchTab
    ? pathname === path && (searchParams.get("tab") ?? "") === (new URLSearchParams(query).get("tab") ?? "")
    : onPath;

  return (
    <Link
      href={href}
      title={title}
      aria-current={active ? "page" : undefined}
      data-active={active ? "" : undefined}
      className={className}
    >
      {children}
    </Link>
  );
}
