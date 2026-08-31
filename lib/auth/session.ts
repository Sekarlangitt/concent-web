import "server-only";

import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_DURATION_SECONDS,
} from "@/lib/auth/config";
import { getAuthSecret } from "@/lib/auth/secrets";
import {
  signSessionToken,
  verifySessionToken,
  type AdminSessionClaims,
} from "@/lib/auth/session-token";

/**
 * Admin session cookie handling (STEP 9).
 *
 * The session is represented by a signed JWT stored in an HttpOnly cookie.
 * Browser JavaScript cannot read it (httpOnly), it is confined to the site
 * (sameSite: "lax"), sent only over HTTPS in production (secure), lives at
 * path "/", and expires after 8 hours (maxAge). The cookie value is never
 * logged anywhere.
 *
 * This module is server-only: it touches the Next.js request cookies store
 * and AUTH_SECRET, and must never be imported by a Client Component.
 */

export type AdminSession = AdminSessionClaims;

/** Creates the HttpOnly session cookie for a verified admin. */
export async function createAdminSession(admin: {
  id: string;
  email: string;
}): Promise<void> {
  const secret = getAuthSecret();
  const token = await signSessionToken(
    { adminId: admin.id, email: admin.email },
    secret,
    ADMIN_SESSION_DURATION_SECONDS,
  );

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_DURATION_SECONDS,
  });
}

/**
 * Reads and verifies the session cookie.
 *
 * Returns the trusted session claims, or null when the cookie is absent,
 * malformed, tampered with, or expired. A misconfigured/missing AUTH_SECRET
 * throws intentionally so the server fails loudly instead of authenticating
 * with a weak key (see secrets.ts).
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const secret = getAuthSecret();
  return verifySessionToken(token, secret);
}

/** Destroys the session cookie (logout). */
export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE_NAME);
}
