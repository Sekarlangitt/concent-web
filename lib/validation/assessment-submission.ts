import { z } from "zod";
import { assessmentAnswersSchema, fullNameSchema, majorSchema } from "@/lib/validation";

/**
 * Server-side submission validation (STEP 7, database-questionnaire edition).
 *
 * The client submits ONLY identity data, the questionnaire version it was
 * locked to, and stable answer IDs:
 *
 *   {
 *     fullName: "Student Name",
 *     major: "INFORMATICS",
 *     questionnaireVersionId: "cm...",
 *     answers: { "<questionId>": "<optionId>", ... }
 *   }
 *
 * Anything else (rawScore, normalizedScore, recommendedConcentration,
 * weights, question text, labels) is not part of the schema and is therefore
 * never accepted. The server derives all scoring inputs from the database
 * weights of the referenced questionnaire version.
 */
export const assessmentSubmissionSchema = z.object({
  fullName: fullNameSchema,
  major: majorSchema,
  questionnaireVersionId: z.string().trim().min(1).max(100),
  answers: assessmentAnswersSchema,
});

export type AssessmentSubmission = z.infer<typeof assessmentSubmissionSchema>;

