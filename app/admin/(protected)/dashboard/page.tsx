import type { Metadata } from "next";

import { AssessmentsOverTimeChart } from "@/components/admin/charts/AssessmentsOverTimeChart";
import { MajorDistributionChart } from "@/components/admin/charts/MajorDistributionChart";
import { RecommendationDistributionChart } from "@/components/admin/charts/RecommendationDistributionChart";
import { MostRecommendedCard } from "@/components/admin/MostRecommendedCard";
import { StatCard } from "@/components/admin/StatCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/admin";
import { ADMIN_ASSESSMENTS_ROUTE } from "@/lib/auth/config";
import {
  ASSESSMENTS_OVER_TIME_DAYS,
  calculatePercentage,
  formatAverageSuitability,
  formatShortDate,
  getBusiestDay,
  type AssessmentsOverTimeDatum,
} from "@/lib/admin/dashboard-utils";
import { getDashboardStats, type DashboardStats } from "@/lib/admin/dashboard";
import type { RecommendationDatum } from "@/lib/admin/dashboard-utils";

export const metadata: Metadata = {
  title: "Admin Dashboard | President University",
  description: "Overview of completed concentration assessments.",
  robots: { index: false, follow: false },
};

/**
 * Admin dashboard (STEP 10).
 *
 * A protected Server Component: the (protected) admin layout performs the
 * trusted session check first, and this page repeats the boundary check before
 * touching the database, so logged-out visitors can never receive assessment
 * statistics. All data is loaded server-side with Prisma (see
 * lib/admin/dashboard.ts) and passed to Recharts Client Components as plain
 * serializable props — the browser never runs database queries.
 *
 * The dashboard is read-only and dynamic (force-dynamic on the layout), so a
 * page refresh re-reads the current data without mutating anything and the
 * analytics are never statically generated or publicly cached.
 */
export default async function AdminDashboardPage() {
  // Trusted server-side boundary check (redundant with the layout on purpose —
  // this guarantees the page stays protected even if the route-group layout
  // is ever refactored). Client-side state is never used for authorization.
  await requireAdmin();

  const result = await getDashboardStats();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Overview of completed concentration assessments.
          </p>
        </div>
        {result.ok ? (
          <p className="text-xs text-slate-500">Updated {result.stats.generatedAt}</p>
        ) : null}
      </div>

      {result.ok ? (
        <DashboardContent stats={result.stats} />
      ) : (
        <DashboardLoadError />
      )}
    </div>
  );
}

/** Percentage hint for the summary cards, or undefined when there is no data. */
function percentageHint(count: number, total: number): string | undefined {
  if (total <= 0) {
    return undefined;
  }
  const percentage = calculatePercentage(count, total);
  return percentage === null ? undefined : `${percentage}% of assessments`;
}

/**
 * Reduces a server-side recommendation datum to the chart's serializable shape.
 * The raw `concentration` enum stays server-side and is never serialized into
 * the browser bundle/HTML — only the human-readable label and count are sent.
 */
function toChartDatum({ name, count }: RecommendationDatum): {
  name: string;
  count: number;
} {
  return { name, count };
}

function DashboardContent({ stats }: { stats: DashboardStats }) {
  const total = stats.totalAssessments;
  const hasData = total > 0;
  const timelineTotal = stats.assessmentsOverTime.reduce(
    (sum, day) => sum + day.count,
    0,
  );

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="sr-only">
          Summary statistics
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Assessments"
            value={String(total)}
            hint={total === 1 ? "completed assessment" : "completed assessments"}
          />
          <StatCard
            label="Informatics"
            value={String(stats.informaticsCount)}
            hint={percentageHint(stats.informaticsCount, total)}
          />
          <StatCard
            label="Information Systems"
            value={String(stats.informationSystemsCount)}
            hint={percentageHint(stats.informationSystemsCount, total)}
          />
          <StatCard
            label="Average Suitability Score"
            value={formatAverageSuitability(stats.averageSuitability)}
            hint="Average recommended score"
          />
        </div>
      </section>

      {/* Major distribution + most recommended */}
      <section
        aria-label="Major distribution and top recommendation"
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-semibold text-brand-900">
            Assessments by Major
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Completed assessments split by student major.
          </p>
          {hasData ? (
            <MajorDistributionChart data={stats.majorDistribution} />
          ) : (
            <EmptyState
              message="No completed assessments yet."
              subtitle="Once students submit assessments, dashboard analytics will appear here."
            />
          )}
        </Card>

        <MostRecommendedCard
          summary={stats.mostRecommended}
          totalAssessments={total}
        />
      </section>

      {/* Informatics recommendation distribution */}
      <section aria-label="Informatics recommendation distribution">
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-semibold text-brand-900">
            Informatics — Recommendation Distribution
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Recommended concentrations for Informatics assessments.
          </p>
          {stats.informaticsCount > 0 ? (
            <RecommendationDistributionChart
              data={stats.informaticsRecommendationDistribution.map(toChartDatum)}
            />
          ) : (
            <EmptyState
              message="No Informatics assessments yet."
              subtitle="Once students complete Informatics assessments, the distribution will appear here."
            />
          )}
        </Card>
      </section>

      {/* Information Systems recommendation distribution */}
      <section aria-label="Information Systems recommendation distribution">
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-semibold text-brand-900">
            Information Systems — Recommendation Distribution
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Recommended concentrations for Information Systems assessments.
          </p>
          {stats.informationSystemsCount > 0 ? (
            <RecommendationDistributionChart
              data={stats.informationSystemsRecommendationDistribution.map(toChartDatum)}
            />
          ) : (
            <EmptyState
              message="No Information Systems assessments yet."
              subtitle="Once students complete Information Systems assessments, the distribution will appear here."
            />
          )}
        </Card>
      </section>

      {/* Assessments over time */}
      <section aria-label="Assessments over time">
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-semibold text-brand-900">
            Assessments Over Time
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Completed assessments per day over the last{" "}
            {ASSESSMENTS_OVER_TIME_DAYS} days (UTC).
          </p>
          {timelineTotal > 0 ? (
            <AssessmentsOverTimeChart
              data={stats.assessmentsOverTime}
              rangeLabel={timelineRangeLabel(stats.assessmentsOverTime)}
            />
          ) : (
            <EmptyState
              message={
                hasData
                  ? "No completed assessments in the last 30 days."
                  : "No completed assessments yet."
              }
              subtitle="Once students submit assessments, dashboard analytics will appear here."
            />
          )}
          {timelineTotal > 0 ? (
            <BusiestDayNote data={stats.assessmentsOverTime} />
          ) : null}
        </Card>
      </section>

      {/* Assessment records CTA (STEP 11) */}
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-base font-semibold text-brand-900">
            Assessment Records
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Search, filter, sort, and review every completed concentration
            assessment.
          </p>
        </div>
        <Button href={ADMIN_ASSESSMENTS_ROUTE} variant="primary">
          View Assessment Records
        </Button>
      </Card>
    </div>
  );
}


function timelineRangeLabel(data: AssessmentsOverTimeDatum[]): string {
  if (data.length === 0) {
    return `Last ${ASSESSMENTS_OVER_TIME_DAYS} days`;
  }
  const first = data[0];
  const last = data[data.length - 1];
  return `Last ${data.length} days · ${formatShortDate(first.date)} – ${formatShortDate(last.date)} ${last.date.slice(0, 4)}`;
}

function BusiestDayNote({ data }: { data: AssessmentsOverTimeDatum[] }) {
  const busiest = getBusiestDay(data);
  if (!busiest) {
    return null;
  }
  return (
    <p className="mt-2 text-xs text-slate-500">
      Busiest day: {formatShortDate(busiest.date)} {busiest.date.slice(0, 4)} (
      {busiest.count} {busiest.count === 1 ? "assessment" : "assessments"})
    </p>
  );
}

function EmptyState({
  message,
  subtitle,
}: {
  message: string;
  subtitle?: string;
}) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
      <p className="text-sm font-medium text-slate-600">{message}</p>
      {subtitle ? (
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      ) : null}
    </div>
  );
}

function DashboardLoadError() {
  return (
    <div className="rounded-2xl border border-accent-200 bg-accent-50 p-6 sm:p-8">
      <h2 className="text-base font-semibold text-accent-800">
        Dashboard data could not be loaded
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-accent-700">
        Please try again.
      </p>
    </div>
  );
}

