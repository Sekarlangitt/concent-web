import "server-only";

import { prisma } from "@/lib/prisma";
import { normalizeUsername } from "@/lib/auth/normalize-username";
import { verifyPassword } from "@/lib/auth/passwords";

/**
 * Server-side credential verification.
 *
 * 1. Normalize the username (trim + lowercase) so case never causes a mismatch.
 * 2. Look up the Admin by that normalized username, selecting only the fields
 *    needed for authentication (id, username, email, passwordHash).
 * 3. Verify the supplied password against the stored bcrypt hash using
 *    bcrypt's standard compare — never a manual hash comparison.
 *
 * The return value is deliberately all-or-nothing: null for both "unknown
 * username" and "wrong password", so callers can show a single generic
 * "Invalid username or password." message without enabling account
 * enumeration.
 */

export type AdminCredentialsResult = {
  id: string;
  username: string;
  email: string;
};

export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<AdminCredentialsResult | null> {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) {
    return null;
  }

  const admin = await prisma.admin.findUnique({
    where: { username: normalizedUsername },
    select: { id: true, username: true, email: true, passwordHash: true },
  });

  if (!admin?.username) {
    return null;
  }

  const passwordMatches = await verifyPassword(password, admin.passwordHash);
  if (!passwordMatches) {
    return null;
  }

  return { id: admin.id, username: admin.username, email: admin.email };
}

