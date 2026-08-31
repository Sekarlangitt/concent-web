import { AdminHeader } from "@/components/admin/AdminHeader";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

/**
 * Protected admin layout (STEP 9, footer added STEP 10).
 *
 * Every route inside this route group (/admin/dashboard today; /admin/students,
 * /admin/assessments later) is guarded here — logged-out visitors are
 * redirected to /admin/login before any page content renders. The page never
 * relies on middleware alone: this layout performs the trusted server-side
 * session + database check on every request.
 *
 * `dynamic = "force-dynamic"` keeps protected pages out of the static cache so
 * per-request auth state is always honored and admin analytics are never
 * publicly statically generated.
 */
export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <AdminHeader admin={admin} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white/70">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
          <p className="text-xs leading-relaxed text-slate-500">
            President University · Concentration Recommendation System · Admin
            area
          </p>
        </div>
      </footer>
    </div>
  );
}

