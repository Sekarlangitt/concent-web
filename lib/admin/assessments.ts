import "server-only";

import type { Concentration } from "@/data/concentrations";
import type { Major } from "@/lib/major";
import {
  ASSESSMENTS_PAGE_SIZE,
  buildAssessmentOrderBy,
  buildAssessmentWhere,
  getAssessmentPagination,
  type AssessmentListParams,
} from "@/lib/admin/assessment-query";
import { prisma } from "@/lib/prisma";

/**
 * STEP 11 assessment-records data service (server-only).
 *
 * `getAssessments` runs one paginated list query plus a parallel filtered
 * count — the UI never loads every record into the browser and filters there.
 * The list selects only the columns the table renders (no answers/scores per
 * row), avoiding N+1 queries.
 *
 * `getAssessmentDetail` loads a single assessment with its answers and
 * concentration scores for the detail route.
 *
 * `deleteAssessmentRecord` deletes by unique id only (never by name) and
 * verifies the schema-level cascade removed every related answer/score row.
 * Authorization is enforced by the caller (the server action), never here.
 */

/** The exact fields the list table needs — deliberately excludes relations. */
const LIST_SELECT = {
  id: true,
  fullName: true,
  major: true,
  recommendedConcentration: true,
  recommendedScore: true,
  completedAt: true,
  createdAt: true,
} as const;

export type AssessmentListRecord = {
  id: string;
  fullName: string;
  major: Major;
  recommendedConcentration: Concentration;
  recommendedScore: number;
  completedAt: Date | null;
  createdAt: Date;
};

export type AssessmentListResult = {
  records: AssessmentListRecord[];
  totalRecords: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

/**
 * Loads one page of completed assessments with the given filters/sort.
 * List and count queries run in parallel; page-based skip/take keeps the
 * query bounded to the requested page.
 */
export async function getAssessments(
  params: AssessmentListParams,
  pageSize: number = ASSESSMENTS_PAGE_SIZE,
): Promise<AssessmentListResult> {
  const where = buildAssessmentWhere(params);
  const orderBy = buildAssessmentOrderBy(params.sort);
  const requestedPage = params.page >= 1 ? params.page : 1;
  const skip = (requestedPage - 1) * pageSize;

  const [rows, totalRecords] = await Promise.all([
    prisma.assessment.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: LIST_SELECT,
    }),
    prisma.assessment.count({ where }),
  ]);

  const { page, totalPages } = getAssessmentPagination(requestedPage, pageSize, totalRecords);

  return {
    records: rows as AssessmentListRecord[],
    totalRecords,
    totalPages,
    page,
    pageSize,
  };
}

/**
 * Loads one assessment with its stored answers, concentration scores, and the
 * questionnaire version it referenced (when available). Returns null when the
 * id does not exist.
 */
export async function getAssessmentDetail(id: string) {
  return prisma.assessment.findUnique({
    where: { id },
    include: {
      answers: true,
      concentrationScores: true,
      questionnaireVersion: {
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: { options: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });
}

/**
 * Deletes an assessment by unique id. Returns false when the id no longer
 * exists (already removed) so the caller can handle that outcome cleanly.
 *
 * Cascade: the Prisma schema declares `onDelete: Cascade` on both
 * AssessmentAnswer.assessment and ConcentrationScore.assessment, so deleting
 * the Assessment removes every related answer and score row in the same
 * statement. After deletion the counts are re-checked and any (impossible)
 * orphan rows are logged loudly.
 */
export async function deleteAssessmentRecord(id: string): Promise<boolean> {
  const existing = await prisma.assessment.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return false;
  }

  await prisma.assessment.delete({ where: { id } });

  const [orphanAnswers, orphanScores] = await Promise.all([
    prisma.assessmentAnswer.count({ where: { assessmentId: id } }),
    prisma.concentrationScore.count({ where: { assessmentId: id } }),
  ]);
  if (orphanAnswers !== 0 || orphanScores !== 0) {
    console.error("[admin/assessments] cascade delete left orphan rows", {
      assessmentId: id,
      orphanAnswers,
      orphanScores,
    });
  }

  return true;
}
