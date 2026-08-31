"use server";

import { redirect } from "next/navigation";
import { ADMIN_LOGIN_ROUTE } from "@/lib/auth/config";
import { destroyAdminSession } from "@/lib/auth/session";

/**
 * Server Action for admin logout (STEP 9).
 *
 * Logout is a POST-only server action — never a GET route that mutates
 * authentication state. It clears the HttpOnly session cookie using the same
 * name/path attributes it was created with, then redirects to /admin/login.
 * After this, protected admin routes are no longer accessible.
 */
export async function logoutAdmin(): Promise<void> {
  try {
    await destroyAdminSession();
  } catch (error) {
    // Still redirect to login; the cookie is cleared best-effort and the
    // session expires on its own. Never surface internals to the admin.
    console.error("[admin] failed to clear the session cookie:", error);
  }

  redirect(ADMIN_LOGIN_ROUTE);
}
