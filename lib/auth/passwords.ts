import bcrypt from "bcryptjs";
import { BCRYPT_SALT_ROUNDS } from "@/lib/auth/config";

/**
 * Password hashing (STEP 9).
 *
 * Passwords are hashed with bcrypt (bcryptjs — pure JavaScript, no native
 * build step, reliable in the Next.js/Vercel environment) at cost
 * BCRYPT_SALT_ROUNDS (12). The database stores only the hash; the plaintext
 * password never reaches logs, cookies, or client code.
 *
 * The bcrypt cost is documented in lib/auth/config.ts. Cost 12 is a
 * reasonable default for this university project — strong enough for
 * offline-attack resistance while keeping login latency acceptable.
 */

/** Hashes a plaintext password with bcrypt at the configured cost. */
export async function hashPassword(
  password: string,
  saltRounds: number = BCRYPT_SALT_ROUNDS,
): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash using bcrypt's
 * standard compare (constant-time within bcrypt). Returns false — never
 * throws — for malformed/empty hashes so a corrupt record cannot crash a
 * login attempt or leak internal details.
 */
export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (!passwordHash) {
    return false;
  }

  try {
    return await bcrypt.compare(password, passwordHash);
  } catch {
    return false;
  }
}
