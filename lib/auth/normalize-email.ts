/**
 * Email normalization shared by provisioning, login, and database lookups.
 *
 * Normalizing consistently (trim + lowercase) in one place prevents case and
 * whitespace mismatches: an admin seeded as `Admin@University.edu` can log in
 * as `admin@university.edu`.
 *
 * Returns null for non-string or empty input so callers can treat it as
 * "invalid input" without throwing.
 */
export function normalizeEmail(email: string): string | null {
  if (typeof email !== "string") {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}
