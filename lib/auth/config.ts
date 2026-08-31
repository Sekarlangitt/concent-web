/**
 * Central configuration for the STEP 9 admin authentication system.
 *
 * This module intentionally contains NO secrets and imports nothing, so it can
 * be safely imported by server modules, the seed script, and unit tests alike.
 * The AUTH_SECRET itself lives in `lib/auth/secrets.ts` (server-only).
 */

/** Name of the HttpOnly admin session cookie (centralized here). */
export const ADMIN_SESSION_COOKIE_NAME = "presuniv_admin_session";

/** Admin session lifetime: 8 hours (in seconds). */
export const ADMIN_SESSION_DURATION_SECONDS = 8 * 60 * 60;

/** Admin session lifetime in milliseconds. */
export const ADMIN_SESSION_DURATION_MS = ADMIN_SESSION_DURATION_SECONDS * 1000;

/** JWT algorithm used to sign the session token. Fixed, never inferred. */
export const SESSION_TOKEN_ALGORITHM = "HS256";

/** Bcrypt cost factor used when hashing admin passwords. */
export const BCRYPT_SALT_ROUNDS = 12;

/** Route helpers shared across the admin area. */
export const ADMIN_LOGIN_ROUTE = "/admin/login";
export const ADMIN_DASHBOARD_ROUTE = "/admin/dashboard";
export const ADMIN_ASSESSMENTS_ROUTE = "/admin/assessments";


/** Lightweight per-process login rate limit (see lib/auth/rate-limit.ts). */
export const ADMIN_LOGIN_MAX_ATTEMPTS = 10;
export const ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
