import {
  assessmentSessionSchema,
  type AssessmentSession,
} from "@/lib/validation";

export type { AssessmentSession } from "@/lib/validation";

/** Single storage key for the current in-progress assessment. */
export const ASSESSMENT_SESSION_KEY = "presuniv-concentration-assessment";

/**
 * Module-level cache so repeated reads (e.g. from useSyncExternalStore
 * snapshots) return a stable object reference. Reset on every full page
 * load; save/clear keep it in sync.
 */
let cachedSession: AssessmentSession | null | undefined;

/**
 * Returns sessionStorage when available in the browser, otherwise null.
 * Guards against SSR and browsers with storage disabled.
 */
function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Persists the assessment session. Returns false when storage is unavailable. */
export function saveAssessmentSession(session: AssessmentSession): boolean {
  const storage = getStorage();
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(ASSESSMENT_SESSION_KEY, JSON.stringify(session));
    cachedSession = session;
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads and validates the assessment session.
 * Malformed JSON, missing fields, invalid names, or invalid major values
 * are rejected (the invalid session is returned as null and cleared by the
 * caller via clearAssessmentSession).
 */
export function getAssessmentSession(): AssessmentSession | null {
  if (cachedSession !== undefined) {
    return cachedSession;
  }
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(ASSESSMENT_SESSION_KEY);
    if (!raw) {
      cachedSession = null;
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    const result = assessmentSessionSchema.safeParse(parsed);
    cachedSession = result.success ? result.data : null;
    return cachedSession;
  } catch {
    cachedSession = null;
    return null;
  }
}

/** Removes the assessment session from sessionStorage. */
export function clearAssessmentSession(): void {
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(ASSESSMENT_SESSION_KEY);
    } catch {
      // Ignore storage errors; the session is effectively gone.
    }
  }
  cachedSession = null;
}
