import { z } from "zod";
import { MAJOR_IDS } from "@/lib/major";

/**
 * Full-name validation.
 *
 * - Required, trimmed, and whitespace-only input is rejected.
 * - Between 2 and 100 characters after trimming.
 * - Allows normal human names: letters (any script), combining marks,
 *   numbers, spaces, hyphens, apostrophes, and periods. Not ASCII-only.
 */
export const fullNameSchema = z
  .string()
  .trim()
  .min(1, "Please enter your full name.")
  .min(2, "Full name must be at least 2 characters.")
  .max(100, "Full name must be 100 characters or fewer.")
  .regex(
    /^[\p{L}\p{M}][\p{L}\p{M}\p{N}'’.\- ]*$/u,
    "Full name can only contain letters, spaces, hyphens, apostrophes, and periods.",
  );

/** Major must be exactly one of the official enum values. */
export const majorSchema = z.enum(MAJOR_IDS);

/**
 * Temporary answers keyed by stable question id (e.g. "INF_Q01") holding the
 * selected option id (e.g. "INF_Q01_A"). Persisted only for the current
 * browser session; the authoritative copy is written to the database in a
 * later step.
 */
export const assessmentAnswersSchema = z.record(z.string(), z.string());

/**
 * Zero-based index of the question currently being shown. Any non-negative
 * integer is accepted here; flows clamp it into the actual question set range
 * (20 questions → indices 0–19) on restore. An out-of-range value is
 * recovered by clamping instead of discarding the whole session, because the
 * current position is not core identity data (unlike fullName/major).
 */
export const currentQuestionSchema = z.number().int().min(0);

/** The temporary assessment session persisted in sessionStorage. */
export const assessmentSessionSchema = z.object({
  fullName: fullNameSchema,
  major: majorSchema,
  answers: assessmentAnswersSchema.default({}),
  currentQuestion: currentQuestionSchema.default(0),
});

export type AssessmentSession = z.infer<typeof assessmentSessionSchema>;
