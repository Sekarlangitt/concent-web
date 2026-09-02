/**
 * Username normalization shared by provisioning, login, and database lookups.
 *
 * Normalizing consistently (trim + lowercase) in one place prevents case and
 * whitespace mismatches: an admin seeded as `Admin` can log in as `admin`.
 *
 * Returns null for non-string or empty input so callers can treat it as
 * "invalid input" without throwing.
 */
export function normalizeUsername(username: string): string | null {
  if (typeof username !== "string") {
    return null;
  }

  const normalized = username.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}
