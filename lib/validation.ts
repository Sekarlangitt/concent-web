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

/** One of the supported question types. */
export const questionTypeSchema = z.enum([
  "LIKERT",
  "AGREEMENT",
  "MULTIPLE_CHOICE",
  "SCENARIO",
  "PRIORITY",
]);

/** Client-safe answer option stored in the session (no weights). */
export const studentQuestionOptionSchema = z.object({
  id: z.string().trim().min(1).max(200),
  label: z.string().trim().min(1).max(1000),
});

/** Client-safe question stored in the session (no weights). */
export const studentQuestionSchema = z.object({
  id: z.string().trim().min(1).max(200),
  type: questionTypeSchema,
  text: z.string().trim().min(1).max(2000),
  category: z.string().trim().max(100).optional(),
  helpText: z.string().trim().max(2000).nullable().optional(),
  options: z.array(studentQuestionOptionSchema).min(2).max(30),
});

/**
 * Temporary answers keyed by question id holding the selected option id.
 * Persisted only for the current browser session; the authoritative copy is
 * written to the database on submission.
 */
export const assessmentAnswersSchema = z.record(z.string(), z.string());

/**
 * Zero-based index of the question currently being shown. Any non-negative
 * integer is accepted here; flows clamp it into the actual question set range
 * on restore.
 */
export const currentQuestionSchema = z.number().int().min(0);

/**
 * The temporary assessment session persisted in sessionStorage.
 *
 * `questionnaireVersionId` and `questions` are set when the assessment starts
 * (the server locks the current PUBLISHED questionnaire version for the
 * major). Both are optional so legacy sessions created before questionnaire
 * versioning still parse; the assessment flow treats a session without them
 * as needing to be restarted.
 */
export const assessmentSessionSchema = z.object({
  fullName: fullNameSchema,
  major: majorSchema,
  questionnaireVersionId: z.string().trim().min(1).optional(),
  questions: z.array(studentQuestionSchema).min(1).optional(),
  answers: assessmentAnswersSchema.default({}),
  currentQuestion: currentQuestionSchema.default(0),
});

export type AssessmentSession = z.infer<typeof assessmentSessionSchema>;
export type StudentQuestion = z.infer<typeof studentQuestionSchema>;
export type StudentQuestionOption = z.infer<typeof studentQuestionOptionSchema>;
