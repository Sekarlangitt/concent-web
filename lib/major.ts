/**
 * Canonical application-level major constants and helpers.
 * These values stay aligned with the Prisma `Major` enum
 * (INFORMATICS, INFORMATION_SYSTEMS).
 */

export type Major = "INFORMATICS" | "INFORMATION_SYSTEMS";

export const MAJOR_IDS = ["INFORMATICS", "INFORMATION_SYSTEMS"] as const;

export const MAJOR_LABELS: Record<Major, string> = {
  INFORMATICS: "Informatics",
  INFORMATION_SYSTEMS: "Information Systems",
};

export const MAJOR_PLACEHOLDER_LABEL = "Select your major";

/** Number of questionnaire questions per major. */
export const QUESTIONS_PER_MAJOR = 20;

export function getMajorLabel(major: Major): string {
  return MAJOR_LABELS[major];
}
