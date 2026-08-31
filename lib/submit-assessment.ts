import type { Concentration } from "@/data/concentrations";
import type { Major } from "@/lib/major";

/**
 * Client-side submission helper (STEP 7).
 *
 * Sends only the minimal payload to POST /api/assessments:
 *
 *   { fullName, major, answers }
 *
 * The server is the only authority for scoring: weights, raw scores,
 * normalized scores, the recommendation, and the confidence label are all
 * derived server-side. This helper never constructs or sends them.
 */

export type AssessmentSubmissionPayload = {
  fullName: string;
  major: Major;
  /** Answers keyed by stable question id → stable option id. */
  answers: Record<string, string>;
};

export type AssessmentSubmitResponse = {
  success: true;
  assessmentId: string;
  recommendedConcentration: Concentration;
  recommendedScore: number;
  confidenceLabel: string | null;
  /** True when the server found an already-saved identical assessment. */
  duplicate: boolean;
};

export type AssessmentSubmitErrorKind = "network" | "validation" | "server";

export class AssessmentSubmitError extends Error {
  readonly kind: AssessmentSubmitErrorKind;
  readonly status: number | null;

  constructor(kind: AssessmentSubmitErrorKind, message: string, status: number | null = null) {
    super(message);
    this.name = "AssessmentSubmitError";
    this.kind = kind;
    this.status = status;
  }
}

/** Generic messages that never leak server internals to the student. */
export const SUBMIT_NETWORK_ERROR_MESSAGE =
  "We couldn't submit your assessment. Your answers are still saved in this browser session. Please try again.";

export const SUBMIT_SERVER_ERROR_MESSAGE =
  "We couldn't save your assessment right now. Please try again.";

export async function submitAssessment(
  payload: AssessmentSubmissionPayload,
): Promise<AssessmentSubmitResponse> {
  let response: Response;
  try {
    response = await fetch("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AssessmentSubmitError("network", SUBMIT_NETWORK_ERROR_MESSAGE);
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  // 409 = an identical assessment was already saved; treat it as success and
  // navigate to the existing result.
  if (response.ok || response.status === 409) {
    const result = data as Partial<AssessmentSubmitResponse> | null;
    if (
      result &&
      typeof result.assessmentId === "string" &&
      typeof result.recommendedConcentration === "string" &&
      typeof result.recommendedScore === "number"
    ) {
      return {
        success: true,
        assessmentId: result.assessmentId,
        recommendedConcentration: result.recommendedConcentration,
        recommendedScore: result.recommendedScore,
        confidenceLabel:
          typeof result.confidenceLabel === "string" ? result.confidenceLabel : null,
        duplicate: response.status === 409,
      };
    }
    throw new AssessmentSubmitError("server", SUBMIT_SERVER_ERROR_MESSAGE, response.status);
  }

  if (response.status === 400) {
    const body = data as { message?: unknown } | null;
    const message =
      typeof body?.message === "string"
        ? body.message
        : "The assessment is incomplete. Please answer all 20 questions.";
    throw new AssessmentSubmitError("validation", message, response.status);
  }

  throw new AssessmentSubmitError("server", SUBMIT_SERVER_ERROR_MESSAGE, response.status);
}
