"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Admin nav link with a visible active state. A small Client Component so the
 * active route is detected from the current pathname without giving up the
 * server-rendered header shell.
 */
export function AdminNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "focus-ring inline-flex h-9 items-center justify-center rounded-lg border border-brand-600 bg-brand-800 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          : "focus-ring inline-flex h-9 items-center justify-center rounded-lg border border-transparent px-3.5 text-sm font-medium text-brand-200 transition-colors hover:bg-brand-800 hover:text-white"
      }
    >
      {children}
    </Link>
  );
}
