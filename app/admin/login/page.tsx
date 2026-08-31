import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { Card } from "@/components/ui/Card";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { ADMIN_DASHBOARD_ROUTE } from "@/lib/auth/config";

export const metadata: Metadata = {
  title: "Admin Login | President University",
  description:
    "Restricted area for President University Concentration Recommendation System administrators.",
};

/**
 * Admin login page (STEP 9).
 *
 * Server-side redirect: a visitor who already holds a valid session (verified
 * token AND existing Admin record) is sent straight to /admin/dashboard
 * instead of seeing the form.
 */
export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) {
    redirect(ADMIN_DASHBOARD_ROUTE);
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-col px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <div className="flex justify-center">
        <Image
          src="/images/presuniv-logo.jpeg"
          alt="President University logo"
          width={285}
          height={320}
          priority
          className="h-16 w-auto sm:h-20"
        />
      </div>

      <h1 className="mt-8 text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Admin Login
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-relaxed text-slate-600">
        Sign in to access the concentration assessment administration area.
      </p>

      <Card className="mt-8 p-6 sm:p-8">
        <AdminLoginForm />
      </Card>
    </section>
  );
}
