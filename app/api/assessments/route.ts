import { prisma } from "@/lib/prisma";
import {
  AssessmentSubmissionError,
  scoreAssessment,
} from "@/lib/scoring/score-assessment";
import { assessmentSubmissionSchema } from "@/lib/validation/assessment-submission";
import {
  VERSION_INCLUDE,
  mapVersionRecordToShape,
} from "@/lib/questionnaires/load-version";
import {
  buildAnswerSnapshots,
  toScoreQuestionSet,
} from "@/lib/questionnaires/scoring";
import type { Major } from "@/lib/major";

/**
 * POST /api/assessments — authoritative assessment submission (STEP 7,
 * database-questionnaire edition).
 *
 * Flow:
 *   1. Zod-validate the small payload (fullName, major,
 *      questionnaireVersionId, answers).
 *   2. Load the questionnaire version the student was locked to (including
 *      its database questions/options/weights) and verify it exists, belongs
 *      to the submitted major, and is PUBLISHED or ARCHIVED.
 *   3. scoreAssessment() validates every answer against that trusted version
 *      and computes raw → maximum → normalized → ranking → recommendation →
 *      confidence purely server-side using database weights.
 *   4. A Prisma transaction atomically creates the Assessment record (with
 *      questionnaireVersionId), its 20 AssessmentAnswer rows (with historical
 *      question/answer snapshots), and its ConcentrationScore rows.
 *   5. A time-windowed duplicate check protects against accidental repeat
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
  questionnaireVersionId: string;
  answers: Record<string, string>;
};

/**
 * Best-effort server-side duplicate guard: finds a recently completed
 * assessment for the same student name, major, and questionnaire version
 * whose stored answers are byte-identical to this submission. Returns its id,
 * or null.
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
      questionnaireVersionId: input.questionnaireVersionId,
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

  const { fullName, major, questionnaireVersionId, answers } = parsed.data;

  // Load the version the student was locked to (PUBLISHED or ARCHIVED). An
  // archived version remains valid for in-flight/historical assessments.
  const versionRecord = await prisma.questionnaireVersion.findUnique({
    where: { id: questionnaireVersionId },
    include: VERSION_INCLUDE,
  });

  if (
    !versionRecord ||
    versionRecord.major !== major ||
    (versionRecord.status !== "PUBLISHED" &&
      versionRecord.status !== "ARCHIVED")
  ) {
    return jsonResponse(
      {
        success: false,
        error: "validation",
        message:
          "The questionnaire for this assessment is no longer available. Please start a new assessment.",
      },
      400,
    );
  }

  const version = mapVersionRecordToShape(versionRecord);

  let scored;
  try {
    scored = scoreAssessment({
      major,
      answers,
      questionSet: toScoreQuestionSet(version),
    });
  } catch (error) {
    if (error instanceof AssessmentSubmissionError) {
      return jsonResponse(
        { success: false, error: "validation", message: error.message },
        400,
      );
    }
    throw error;
  }

  const snapshots = buildAnswerSnapshots(version, scored);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const duplicateAssessmentId = await findDuplicateAssessmentId(tx, {
          fullName,
          major,
          questionnaireVersionId,
          answers,
        });
        if (duplicateAssessmentId) {
          return { assessmentId: duplicateAssessmentId, duplicate: true as const };
        }

        const assessment = await tx.assessment.create({
          data: {
            fullName,
            major,
            questionnaireVersionId,
            recommendedConcentration: scored.recommendedConcentration,
            recommendedScore: scored.recommendedScore,
            confidenceLabel: scored.confidenceLabel,
            completedAt: new Date(),
            answers: {
              create: scored.answers.map((answer, index) => {
                const snapshot = snapshots[index];
                return {
                  questionId: answer.questionId,
                  answerKey: answer.answerKey,
                  optionId: answer.answerKey,
                  numericValue: answer.numericValue,
                  questionSnapshot: snapshot.questionSnapshot,
                  answerSnapshot: snapshot.answerSnapshot,
                };
              }),
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
      },
      { timeout: 60_000 },
    );

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

