import "server-only";

import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { verifyPassword } from "@/lib/auth/passwords";

/**
 * Server-side credential verification (STEP 9).
 *
 * 1. Normalize the email (trim + lowercase) so case never causes a mismatch.
 * 2. Look up the Admin by that normalized email, selecting only the fields
 *    needed for authentication (id, email, passwordHash).
 * 3. Verify the supplied password against the stored bcrypt hash using
 *    bcrypt's standard compare — never a manual hash comparison.
 *
 * The return value is deliberately all-or-nothing: null for both "unknown
 * email" and "wrong password", so callers can show a single generic
 * "Invalid email or password." message without enabling account enumeration.
 */

export type AdminCredentialsResult = {
  id: string;
  email: string;
};

export async function verifyAdminCredentials(
  email: string,
  password: string,
): Promise<AdminCredentialsResult | null> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  const admin = await prisma.admin.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, passwordHash: true },
  });

  if (!admin) {
    return null;
  }

  const passwordMatches = await verifyPassword(password, admin.passwordHash);
  if (!passwordMatches) {
    return null;
  }

  return { id: admin.id, email: admin.email };
}
