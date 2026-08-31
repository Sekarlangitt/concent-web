import Image from "next/image";

import { AdminNavLink } from "@/components/admin/AdminNavLink";
import { LogoutButton } from "@/components/admin/LogoutButton";
import {
  ADMIN_ASSESSMENTS_ROUTE,
  ADMIN_DASHBOARD_ROUTE,
} from "@/lib/auth/config";
import type { CurrentAdmin } from "@/lib/auth/admin";

/**
 * Admin header for the protected area (STEP 10, STEP 11 nav update).
 *
 * Shows the President University logo, the admin section title, the signed-in
 * admin email, and the admin navigation (Dashboard, Assessments, and Logout).
 * The active route is highlighted via AdminNavLink. Only the admin email is
 * exposed — never the internal admin id or the password hash. No dead links:
 * the Assessments link is live now that /admin/assessments exists.
 */
export function AdminHeader({ admin }: { admin: CurrentAdmin }) {
  return (
    <header className="border-b border-brand-800 bg-brand-900 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/images/presuniv-logo.jpeg"
            alt="President University logo"
            width={285}
            height={320}
            className="h-10 w-auto shrink-0 rounded bg-white/95 p-0.5"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight sm:text-base">
              Concentration Recommendation Admin
            </p>
            <p className="truncate text-xs text-brand-200" data-testid="admin-header-email">
              Signed in as {admin.email}
            </p>
          </div>
        </div>

        <nav
          aria-label="Admin"
          className="ml-auto flex shrink-0 items-center gap-2"
        >
          <AdminNavLink href={ADMIN_DASHBOARD_ROUTE}>Dashboard</AdminNavLink>
          <AdminNavLink href={ADMIN_ASSESSMENTS_ROUTE}>Assessments</AdminNavLink>
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}


