import "server-only";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ADMIN_LOGIN_ROUTE } from "@/lib/auth/config";
import { getAdminSession } from "@/lib/auth/session";

/**
 * Admin identity helpers (STEP 9).
 *
 * getCurrentAdmin() verifies the session token AND confirms the referenced
 * Admin record still exists in the database, so deleting or deactivating an
 * admin invalidates their future access. Only id and email are selected —
 * passwordHash is never returned to the UI.
 *
 * requireAdmin() is the server-side guard used by protected routes/layouts.
 * Client-side state is NEVER used for authorization; access is controlled
 * entirely here, per request.
 */

export type CurrentAdmin = {
  id: string;
  email: string;
};

/**
 * Returns the current admin ({ id, email }) or null when the visitor is not
 * authenticated (no session, invalid/expired session, or deleted admin).
 * Never memoized/cached — every call reflects the current request.
 */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const session = await getAdminSession();
  if (!session) {
    return null;
  }

  try {
    const admin = await prisma.admin.findUnique({
      where: { id: session.adminId },
      select: { id: true, email: true },
    });

    if (!admin) {
      return null;
    }

    return { id: admin.id, email: admin.email };
  } catch (error) {
    console.error("[auth] failed to load the current admin:", error);
    return null;
  }
}

/**
 * Requires a valid admin session. Redirects to the login page when the
 * visitor is not authenticated; returns the admin otherwise.
 */
export async function requireAdmin(): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect(ADMIN_LOGIN_ROUTE);
  }
  return admin;
}
