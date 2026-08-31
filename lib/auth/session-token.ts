import { SignJWT, jwtVerify } from "jose";
import { SESSION_TOKEN_ALGORITHM } from "@/lib/auth/config";

/**
 * Signed admin session token (STEP 9).
 *
 * The token is a JWT signed with HMAC-SHA256 using AUTH_SECRET. Only three
 * claims are stored: adminId, email, and the JWT-standard iat/exp timestamps.
 * No password hash, no database credentials — the payload is minimal by
 * design.
 *
 * This module is pure (no Next.js request context, no database) so the token
 * logic can be unit tested directly. Cookie handling lives in session.ts.
 *
 * Verification always:
 *  - checks the signature,
 *  - fixes the algorithm to HS256 (never inferred from the token header),
 *  - rejects expired tokens,
 *  - validates the required claims,
 * and returns null for anything malformed or tampered with.
 */

export type AdminSessionClaims = {
  adminId: string;
  email: string;
};

/**
 * Signs a new session token that expires in `expiresInSeconds` seconds.
 */
export async function signSessionToken(
  admin: AdminSessionClaims,
  secret: string,
  expiresInSeconds: number,
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + expiresInSeconds;

  return new SignJWT({ adminId: admin.adminId, email: admin.email })
    .setProtectedHeader({ alg: SESSION_TOKEN_ALGORITHM })
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(secret));
}

/**
 * Verifies a session token. Returns the trusted claims, or null when the
 * token is missing, malformed, tampered with, expired, or signed by a
 * different secret. Callers must treat null as "logged out".
 */
export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<AdminSessionClaims | null> {
  if (!token || !secret) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: [SESSION_TOKEN_ALGORITHM],
    });

    if (typeof payload.adminId !== "string" || typeof payload.email !== "string") {
      return null;
    }

    return { adminId: payload.adminId, email: payload.email };
  } catch {
    // Signature mismatch, expired token, or malformed payload — all equivalent
    // to an unauthenticated visitor.
    return null;
  }
}
