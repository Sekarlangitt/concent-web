import { prisma } from "@/lib/prisma";
import {
  AssessmentSubmissionError,
  scoreAssessment,
} from "@/lib/scoring/score-assessment";
import { assessmentSubmissionSchema } from "@/lib/validation/assessment-submission";
import type { Major } from "@/lib/major";

/**
 * POST /api/assessments — authoritative assessment submission (STEP 7).
 *
 * Flow:
 *   1. Zod-validate the small payload (fullName, major, answers).
 *   2. scoreAssessment() validates every answer against the trusted question
 *      configuration and computes raw → maximum → normalized → ranking →
 *      recommendation → confidence purely server-side.
 *   3. A Prisma transaction atomically creates the Assessment record, its 20
 *      AssessmentAnswer rows, and its ConcentrationScore rows (6 for
 *      Informatics, 2 for Information Systems).
 *   4. A time-windowed duplicate check protects against accidental repeat
 *      submissions (in addition to the client's in-flight guard).
 *
 * Status codes:
 *   201 created     — assessment saved
 *   409 conflict    — an identical assessment was already saved (returns the
 *                      existing assessment id so the client can navigate to it)
 *   400 bad request — malformed or incomplete payload
 *   500             — unexpected server/database error (generic message only)
 */

/** Duplicate-submission lookback window for the server-side guard. */
const DUPLICATE_WINDOW_MS = 15 * 60 * 1000;

type DuplicateLookupInput = {
  fullName: string;
  major: Major;
  answers: Record<string, string>;
};

/**
 * Best-effort server-side duplicate guard: finds a recently completed
 * assessment for the same student name and major whose 20 stored answers are
 * byte-identical to this submission. Returns its id, or null.
 *
 * This is intentionally not a distributed idempotency system — the primary
 * protection is the client's in-flight lock and completion marker, so a
 * simple time window is sufficient here.
 */
async function findDuplicateAssessmentId(
  tx: Pick<typeof prisma, "assessment">,
  input: DuplicateLookupInput,
): Promise<string | null> {
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
  const candidates = await tx.assessment.findMany({
    where: {
      fullName: input.fullName,
      major: input.major,
      createdAt: { gte: since },
    },
    select: {
      id: true,
      answers: { select: { questionId: true, answerKey: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const submittedFingerprint = Object.entries(input.answers)
    .map(([questionId, answerKey]) => `${questionId}::${answerKey}`)
    .sort()
    .join("|");

  for (const candidate of candidates) {
    if (candidate.answers.length !== Object.keys(input.answers).length) {
      continue;
    }
    const candidateFingerprint = candidate.answers
      .map((answer) => `${answer.questionId}::${answer.answerKey}`)
      .sort()
      .join("|");
    if (candidateFingerprint === submittedFingerprint) {
      return candidate.id;
    }
  }
  return null;
}

function jsonResponse(data: unknown, status: number): Response {
  return Response.json(data, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        success: false,
        error: "invalid-json",
        message: "The assessment payload could not be read. Please try again.",
      },
      400,
    );
  }

  const parsed = assessmentSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      {
        success: false,
        error: "validation",
        message:
          "The assessment payload is invalid. Please review your answers and try again.",
      },
      400,
    );
  }

  const { fullName, major, answers } = parsed.data;

  let scored;
  try {
    scored = scoreAssessment({ major, answers });
  } catch (error) {
    if (error instanceof AssessmentSubmissionError) {
      return jsonResponse(
        { success: false, error: "validation", message: error.message },
        400,
      );
    }
    throw error;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const duplicateAssessmentId = await findDuplicateAssessmentId(tx, {
        fullName,
        major,
        answers,
      });
      if (duplicateAssessmentId) {
        return { assessmentId: duplicateAssessmentId, duplicate: true as const };
      }

      const assessment = await tx.assessment.create({
        data: {
          fullName,
          major,
          recommendedConcentration: scored.recommendedConcentration,
          recommendedScore: scored.recommendedScore,
          confidenceLabel: scored.confidenceLabel,
          completedAt: new Date(),
          answers: {
            create: scored.answers.map((answer) => ({
              questionId: answer.questionId,
              answerKey: answer.answerKey,
              numericValue: answer.numericValue,
            })),
          },
          concentrationScores: {
            create: scored.scores.map((score) => ({
              concentration: score.concentration,
              rawScore: score.rawScore,
              normalizedScore: score.normalizedScore,
            })),
          },
        },
        select: { id: true },
      });

      return { assessmentId: assessment.id, duplicate: false as const };
    });

    return jsonResponse(
      {
        success: true,
        assessmentId: result.assessmentId,
        recommendedConcentration: scored.recommendedConcentration,
        recommendedScore: scored.recommendedScore,
        confidenceLabel: scored.confidenceLabel,
        duplicate: result.duplicate,
      },
      result.duplicate ? 409 : 201,
    );
  } catch (error) {
    // Log technical details for development, never secrets or stack traces to
    // the student.
    console.error("[api/assessments] failed to store assessment:", error);
    return jsonResponse(
      {
        success: false,
        error: "server",
        message: "We couldn't save your assessment right now. Please try again.",
      },
      500,
    );
  }
}
