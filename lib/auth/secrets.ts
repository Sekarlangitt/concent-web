import "server-only";

/**
 * Server-only accessor for AUTH_SECRET.
 *
 * The secret is never imported by client code (this module is marked
 * server-only) and never inlined with a NEXT_PUBLIC_ prefix. If the secret is
 * missing or too weak, we fail loudly instead of silently falling back to a
 * known development secret — a hard failure is always preferable to a
 * deployment that signs sessions with a guessable key.
 *
 * Local development: generate a strong secret and put it in `.env` (which is
 * git-ignored), for example:
 *
 *   openssl rand -base64 32
 */

/** Minimum acceptable secret length (32 chars ≈ 256 bits of entropy). */
const MIN_AUTH_SECRET_LENGTH = 32;

export function getAuthSecret(): string {
  const raw = process.env.AUTH_SECRET;
  const secret = typeof raw === "string" ? raw.trim() : "";

  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not configured. Set AUTH_SECRET in your environment " +
        "(see .env.example). Generate a strong value with: openssl rand -base64 32",
    );
  }

  if (secret.length < MIN_AUTH_SECRET_LENGTH) {
    throw new Error(
      `AUTH_SECRET is too short (${secret.length} characters). Use at least ` +
        `${MIN_AUTH_SECRET_LENGTH} characters, e.g. from: openssl rand -base64 32`,
    );
  }

  return secret;
}
