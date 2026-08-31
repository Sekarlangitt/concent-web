import type { Major } from "@/lib/major";

/**
 * Completed-assessment marker (STEP 7).
 *
 * After a successful server submission a small marker is saved in
 * sessionStorage so that:
 *  - the Review page can show "already submitted" instead of letting the
 *    student submit the same answers again (browser Back protection), and
 *  - the result route can clear only the session that just finished.
 *
 * The marker is cleared automatically when a brand-new assessment starts
 * (StudentInformationForm), so it can never block a later student.
 */

export const COMPLETED_ASSESSMENT_KEY = "presuniv-concentration-completed";

export type CompletedAssessmentMarker = {
  fullName: string;
  major: Major;
  assessmentId: string;
};

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

function isValidMarker(value: unknown): value is CompletedAssessmentMarker {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.fullName === "string" &&
    (candidate.major === "INFORMATICS" ||
      candidate.major === "INFORMATION_SYSTEMS") &&
    typeof candidate.assessmentId === "string"
  );
}

export function saveCompletedAssessmentMarker(
  marker: CompletedAssessmentMarker,
): boolean {
  const storage = getStorage();
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(COMPLETED_ASSESSMENT_KEY, JSON.stringify(marker));
    return true;
  } catch {
    return false;
  }
}

export function getCompletedAssessmentMarker(): CompletedAssessmentMarker | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(COMPLETED_ASSESSMENT_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isValidMarker(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearCompletedAssessmentMarker(): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(COMPLETED_ASSESSMENT_KEY);
  } catch {
    // Ignore storage errors; the marker is effectively gone.
  }
}
