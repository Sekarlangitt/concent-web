import { z } from "zod";

import { majorSchema, fullNameSchema } from "@/lib/validation";
import {
  getPublishedVersionForMajor,
  serializeStudentQuestions,
} from "@/lib/questionnaires/student-questionnaire";

/**
 * POST /api/questionnaire — locks the current published questionnaire for the
 * student's major.
 *
 * The client sends only { fullName, major }. The server resolves the currently
 * PUBLISHED QuestionnaireVersion for that major and returns:
 *
 *   {
 *     success: true,
 *     questionnaireVersionId,
 *     versionNumber,
 *     questions: [ { id, type, text, category, helpText, options: [{id,label}] } ]
 *   }
 *
 * The response NEVER includes scoring weights — it is the client-safe
 * serialization used by the assessment session. The version id is stored in
 * the session so the entire attempt (all 20 questions) stays locked to that
 * version even if the admin publishes a newer version mid-assessment.
 *
 * When no published questionnaire exists the response is
 * { success: false, error: "unavailable" } and the student UI shows a
 * graceful message — the app never falls back to hardcoded questions.
 */

const startQuestionnaireSchema = z.object({
  fullName: fullNameSchema,
  major: majorSchema,
});

function jsonResponse(data: unknown, status: number): Response {
  return Response.json(data, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      { success: false, error: "invalid-json", message: "Invalid request body." },
      400,
    );
  }

  const parsed = startQuestionnaireSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      { success: false, error: "validation", message: "Invalid student details." },
      400,
    );
  }

  const { major } = parsed.data;

  try {
    const version = await getPublishedVersionForMajor(major);
    if (!version) {
      return jsonResponse(
        {
          success: false,
          error: "unavailable",
          message:
            "The questionnaire for this major is temporarily unavailable. Please try again later.",
        },
        404,
      );
    }

    const questions = serializeStudentQuestions(version);

    return jsonResponse(
      {
        success: true,
        questionnaireVersionId: version.id,
        versionNumber: version.versionNumber,
        questions,
      },
      200,
    );
  } catch (error) {
    console.error("[api/questionnaire] failed to load questionnaire:", error);
    return jsonResponse(
      {
        success: false,
        error: "unavailable",
        message:
          "The questionnaire for this major is temporarily unavailable. Please try again later.",
      },
      500,
    );
  }
}

export const dynamic = "force-dynamic";
