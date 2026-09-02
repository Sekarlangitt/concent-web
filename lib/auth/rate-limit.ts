/**
 * Lightweight, in-memory login attempt rate limiter.
 *
 * This is deliberately simple: a sliding window of failure timestamps per
 * key (the normalized admin username). It provides small server-side
 * protection against brute-force login attempts without locking anyone out
 * permanently — after the window passes, attempts reset automatically, and
 * the store clears on process restart.
 *
 * LIMITATION: state is per-process. On a multi-instance/serverless deployment
 * each instance keeps its own window, so this is best-effort hardening, not a
 * distributed rate limit. A production-grade limiter (e.g. a managed rate
 * limit or Redis-backed store) should be added before public deployment — see
 * the "Deployment hardening" note in the README.
 *
 * Unit-testable pure module: no request context, no database, no timers.
 */

export type LoginRateLimitOptions = {
  /** Maximum allowed failed attempts within the window. */
  maxAttempts?: number;
  /** Sliding window length in milliseconds. */
  windowMs?: number;
};

/** Failure timestamps per key, oldest first. */
const failuresByKey = new Map<string, number[]>();

function pruneKey(key: string, now: number, windowMs: number): number[] {
  const timestamps = (failuresByKey.get(key) ?? []).filter(
    (timestamp) => now - timestamp <= windowMs,
  );
  failuresByKey.set(key, timestamps);
  return timestamps;
}

/** True when the key has exceeded its allowed failures in the current window. */
export function isLoginRateLimited(
  key: string,
  options: LoginRateLimitOptions = {},
): boolean {
  const { maxAttempts = 10, windowMs = 15 * 60 * 1000 } = options;
  const timestamps = pruneKey(key, Date.now(), windowMs);
  return timestamps.length >= maxAttempts;
}

/** Records a failed attempt for the key. */
export function recordLoginFailure(
  key: string,
  options: LoginRateLimitOptions = {},
): void {
  const { windowMs = 15 * 60 * 1000 } = options;
  const now = Date.now();
  const timestamps = pruneKey(key, now, windowMs);
  timestamps.push(now);
  failuresByKey.set(key, timestamps);
}

/** Clears the failure window for a key (used after a successful login). */
export function clearLoginRateLimit(key: string): void {
  failuresByKey.delete(key);
}

/** Test helper: clears the whole store. */
export function resetLoginRateLimitStore(): void {
  failuresByKey.clear();
}
