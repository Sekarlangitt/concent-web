import { z } from "zod";
import { assessmentAnswersSchema, fullNameSchema, majorSchema } from "@/lib/validation";

/**
 * Server-side submission validation (STEP 7, requirements 4 and 6–8).
 *
 * The client submits ONLY identity data and stable answer IDs:
 *
 *   {
 *     fullName: "Student Name",
 *     major: "INFORMATICS",
 *     answers: { "INF_Q01": "INF_Q01_B", ... }
 *   }
 *
 * Anything else (rawScore, normalizedScore, recommendedConcentration,
 * weights, question text, labels) is not part of the schema and is therefore
 * never accepted. The server derives all scoring inputs from the trusted
 * question configuration.
 */
export const assessmentSubmissionSchema = z.object({
  fullName: fullNameSchema,
  major: majorSchema,
  answers: assessmentAnswersSchema,
});

export type AssessmentSubmission = z.infer<typeof assessmentSubmissionSchema>;
