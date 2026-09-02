import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { Major } from "@/lib/major";
import { VERSION_INCLUDE } from "@/lib/questionnaires/load-version";

/**
 * Student-facing questionnaire service (server-only).
 *
 * When a student begins an assessment the server resolves the CURRENT
 * PUBLISHED questionnaire version for their major and returns:
 *
 *   { questionnaireVersionId, questions }
 *
 * where `questions` is the SAFE serialization (IDs, text, type, category,
 * help text, option IDs + labels — NEVER weights) from
 * lib/questionnaires/serialization.ts. The client stores this in the
 * assessment session so every question of the attempt comes from the exact
 * same version, even if the admin publishes a newer version while the student
 * is mid-assessment.
 */

type PublishedVersionWithQuestions = Prisma.QuestionnaireVersionGetPayload<{
  include: typeof VERSION_INCLUDE;
}>;

/** Loads the currently published version for a major, or null when none exists. */
export async function getPublishedVersionForMajor(
  major: Major,
): Promise<PublishedVersionWithQuestions | null> {
  return prisma.questionnaireVersion.findFirst({
    where: { major, status: "PUBLISHED" },
    include: VERSION_INCLUDE,
    orderBy: { publishedAt: "desc" },
  });
}

export { serializeStudentQuestions } from "@/lib/questionnaires/serialization";

