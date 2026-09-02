"use server";

import { redirect } from "next/navigation";
import { createAdminSession } from "@/lib/auth/session";
import { verifyAdminCredentials } from "@/lib/auth/credentials";
import { ADMIN_DASHBOARD_ROUTE } from "@/lib/auth/config";
import {
  clearLoginRateLimit,
  isLoginRateLimited,
  recordLoginFailure,
} from "@/lib/auth/rate-limit";
import { adminLoginSchema } from "@/lib/validation/admin-login";

/**
 * Server Action for admin login.
 *
 * Flow:
 *   1. Zod-validate username + password (never trust the browser).
 *   2. Best-effort per-process rate limit on repeated failures.
 *   3. Server-side credential check (Prisma + bcrypt.compare).
 *   4. Create the signed HttpOnly session cookie.
 *   5. Redirect to the protected dashboard.
 *
 * Credentials never appear in URLs, query strings, or client state. Error
 * messages are deliberately generic — "Invalid username or password." does not
 * reveal whether the username or the password was the problem, and unexpected
 * failures show a friendly message while the real error is logged server-side.
 */

export type LoginFormState = {
  status: "idle" | "error";
  /** Top-of-form message (generic auth failure or server problem). */
  message?: string;
  /** Per-field validation messages keyed by field name. */
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function loginAdmin(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const usernameInput = formData.get("username");
  const passwordInput = formData.get("password");

  const parsed = adminLoginSchema.safeParse({
    username: typeof usernameInput === "string" ? usernameInput : "",
    password: typeof passwordInput === "string" ? passwordInput : "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check your username and password.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { username, password } = parsed.data;

  if (isLoginRateLimited(username)) {
    return {
      status: "error",
      message: "Too many sign-in attempts. Please wait a few minutes and try again.",
    };
  }

  let admin: { id: string; username: string; email: string } | null = null;
  try {
    admin = await verifyAdminCredentials(username, password);
  } catch (error) {
    // Log technical details for development only — the admin never sees them.
    console.error("[admin/login] credential verification failed:", error);
    return {
      status: "error",
      message: "We couldn't sign you in right now. Please try again.",
    };
  }

  if (!admin) {
    recordLoginFailure(username);
    return { status: "error", message: "Invalid username or password." };
  }

  try {
    await createAdminSession(admin);
  } catch (error) {
    console.error("[admin/login] failed to set the session cookie:", error);
    return {
      status: "error",
      message: "We couldn't sign you in right now. Please try again.",
    };
  }

  clearLoginRateLimit(username);

  // Called after the cookie is reliably set; navigates on the client (or 303
  // redirects for non-JS submissions). Outside any try/catch by design.
  redirect(ADMIN_DASHBOARD_ROUTE);
}
