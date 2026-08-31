import "server-only";

import type { Concentration } from "@/data/concentrations";
import { CONCENTRATIONS_BY_MAJOR } from "@/data/concentrations";
import { getMajorLabel, type Major } from "@/lib/major";
import {
  ASSESSMENTS_OVER_TIME_DAYS,
  buildDailyBuckets,
  calculatePercentage,
  determineMostRecommended,
  fillZeroCounts,
  formatDashboardDate,
  getAssessmentsOverTimePeriod,
  type AssessmentsOverTimeDatum,
  type MajorDistributionDatum,
  type MostRecommendedSummary,
  type RecommendationDatum,
} from "@/lib/admin/dashboard-utils";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * STEP 10 dashboard data service (server-only).
 *
 * `getDashboardStats()` loads every dashboard statistic with a small, fixed
 * number of efficient Prisma queries (count / groupBy / aggregate) executed in
 * parallel, and post-processes the results with the pure helpers from
 * dashboard-utils.ts. No AssessmentAnswer or ConcentrationScore rows are
 * loaded — the dashboard needs only Assessment-level aggregates.
 *
 * Completed-assessment semantics: the submission flow always sets `completedAt`
 * when an assessment is persisted, so every stored Assessment is completed.
 * To stay consistent with the schema (completedAt is nullable) the dashboard
 * explicitly requires `completedAt: { not: null }` on every query; abandoned
 * sessions are never stored and therefore never counted. This means
 * informatics + information systems always reconciles with the total.
 *
 * Malformed data handling: a groupBy row whose recommendedConcentration does
 * not belong to the row's major is excluded from the per-major recommendation
 * charts and logged server-side. It still contributes to the major's total
 * count, so the summary numbers always reconcile.
 */

/** `completedAt != null` — the shared completed-assessment predicate. */
const COMPLETED_WHERE: Prisma.AssessmentWhereInput = {
  completedAt: { not: null },
};

export type DashboardStats = {
  totalAssessments: number;
  informaticsCount: number;
  informationSystemsCount: number;
  /** Average recommendedScore across completed assessments, or null. */
  averageSuitability: number | null;
  mostRecommended: MostRecommendedSummary | null;
  majorDistribution: MajorDistributionDatum[];
  informaticsRecommendationDistribution: RecommendationDatum[];
  informationSystemsRecommendationDistribution: RecommendationDatum[];
  assessmentsOverTime: AssessmentsOverTimeDatum[];
  /** Readable "last updated" timestamp, e.g. "31 Aug 2026" (UTC). */
  generatedAt: string;
};

export type DashboardStatsResult =
  | { ok: true; stats: DashboardStats }
  | { ok: false };

/** Builds a per-major count map, filtering malformed rows for the charts. */
function splitCountsByMajor(
  rows: Array<{
    major: Major;
    recommendedConcentration: Concentration;
    count: number;
  }>,
): {
  informaticsCounts: Partial<Record<Concentration, number>>;
  informationSystemsCounts: Partial<Record<Concentration, number>>;
  informaticsCount: number;
  informationSystemsCount: number;
} {
  const informaticsCounts: Partial<Record<Concentration, number>> = {};
  const informationSystemsCounts: Partial<Record<Concentration, number>> = {};
  let informaticsCount = 0;
  let informationSystemsCount = 0;

  for (const row of rows) {
    if (row.major === "INFORMATICS") {
      informaticsCount += row.count;
      if (CONCENTRATIONS_BY_MAJOR.INFORMATICS.includes(row.recommendedConcentration)) {
        informaticsCounts[row.recommendedConcentration] = row.count;
      } else {
        console.warn(
          "[admin/dashboard] Informatics assessment has a cross-major recommendedConcentration; excluded from the Informatics chart",
          { recommendedConcentration: row.recommendedConcentration, count: row.count },
        );
      }
    } else {
      informationSystemsCount += row.count;
      if (CONCENTRATIONS_BY_MAJOR.INFORMATION_SYSTEMS.includes(row.recommendedConcentration)) {
        informationSystemsCounts[row.recommendedConcentration] = row.count;
      } else {
        console.warn(
          "[admin/dashboard] Information Systems assessment has a cross-major recommendedConcentration; excluded from the Information Systems chart",
          { recommendedConcentration: row.recommendedConcentration, count: row.count },
        );
      }
    }
  }

  return {
    informaticsCounts,
    informationSystemsCounts,
    informaticsCount,
    informationSystemsCount,
  };
}

/**
 * Loads all dashboard statistics.
 *
 * Returns `{ ok: true, stats }` on success or `{ ok: false }` when the
 * database query fails. Technical details are logged server-side only — the
 * caller renders a safe, generic error message and never exposes Prisma/SQL/
 * connection internals.
 */
export async function getDashboardStats(): Promise<DashboardStatsResult> {
  try {
    const now = new Date();
    const period = getAssessmentsOverTimePeriod(now, ASSESSMENTS_OVER_TIME_DAYS);

    const [totalAssessments, grouped, average, timelineRows] = await Promise.all([
      prisma.assessment.count({ where: COMPLETED_WHERE }),
      prisma.assessment.groupBy({
        by: ["major", "recommendedConcentration"],
        where: COMPLETED_WHERE,
        _count: { _all: true },
      }),
      prisma.assessment.aggregate({
        where: COMPLETED_WHERE,
        _avg: { recommendedScore: true },
      }),
      // Only completion timestamps within the 30-day window — no answer rows.
      prisma.assessment.findMany({
        where: {
          completedAt: {
            not: null,
            gte: period.start,
            lt: period.endExclusive,
          },
        },
        select: { completedAt: true },
      }),
    ]);


    const {
      informaticsCounts,
      informationSystemsCounts,
      informaticsCount,
      informationSystemsCount,
    } = splitCountsByMajor(
      grouped.map((row) => ({
        major: row.major as Major,
        recommendedConcentration: row.recommendedConcentration as Concentration,
        count: row._count._all,
      })),
    );

    // Major totals must reconcile with the total. Both values come from the
    // same completed predicate so this holds by construction; the check is a
    // safety net against malformed data.
    const reportedTotal = informaticsCount + informationSystemsCount;
    if (reportedTotal !== totalAssessments) {
      console.warn(
        "[admin/dashboard] major totals do not reconcile with the total assessment count",
        { totalAssessments, reportedTotal },
      );
    }

    const combinedCounts: Partial<Record<Concentration, number>> = {};
    for (const concentration of Object.keys({
      ...informaticsCounts,
      ...informationSystemsCounts,
    }) as Concentration[]) {
      combinedCounts[concentration] =
        (informaticsCounts[concentration] ?? 0) +
        (informationSystemsCounts[concentration] ?? 0);
    }

    const majorDistribution: MajorDistributionDatum[] = [
      {
        name: getMajorLabel("INFORMATICS"),
        count: informaticsCount,
        percentage: calculatePercentage(informaticsCount, totalAssessments),
      },
      {
        name: getMajorLabel("INFORMATION_SYSTEMS"),
        count: informationSystemsCount,
        percentage: calculatePercentage(informationSystemsCount, totalAssessments),
      },
    ];

    const completedDates = timelineRows.flatMap((row) =>
      row.completedAt ? [row.completedAt] : [],
    );

    const stats: DashboardStats = {
      totalAssessments,
      informaticsCount,
      informationSystemsCount,
      averageSuitability: average._avg.recommendedScore ?? null,
      mostRecommended: determineMostRecommended(combinedCounts),
      majorDistribution,
      informaticsRecommendationDistribution: fillZeroCounts(informaticsCounts, "INFORMATICS"),
      informationSystemsRecommendationDistribution: fillZeroCounts(
        informationSystemsCounts,
        "INFORMATION_SYSTEMS",
      ),
      assessmentsOverTime: buildDailyBuckets(completedDates, now, ASSESSMENTS_OVER_TIME_DAYS),
      generatedAt: formatDashboardDate(now),
    };

    return { ok: true, stats };
  } catch (error) {
    console.error("[admin/dashboard] failed to load dashboard statistics:", error);
    return { ok: false };
  }
}

