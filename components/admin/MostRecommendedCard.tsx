import { Card } from "@/components/ui/Card";
import { getConcentrationLabel } from "@/data/concentrations";
import type { MostRecommendedSummary } from "@/lib/admin/dashboard-utils";

/**
 * "Most Recommended Concentration" insight card (STEP 10).
 *
 * Highlights the concentration(s) recommended most often. Ties are shown
 * explicitly (all tied concentrations plus a short note) instead of silently
 * picking a single winner. With zero assessments the card shows a clean
 * "No data yet" state — never a fake concentration.
 */
export function MostRecommendedCard({
  summary,
  totalAssessments,
}: {
  summary: MostRecommendedSummary | null;
  totalAssessments: number;
}) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="h-1 w-full bg-gradient-to-r from-brand-700 via-brand-500 to-accent-500"
      />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h2 className="text-base font-semibold text-brand-900">
          Most Recommended Concentration
        </h2>

        {!summary ? (
          <div className="mt-4 flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
            <p className="text-sm text-slate-600">No data yet</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-1 flex-col">
            <p className="text-xl font-bold leading-snug text-brand-900 sm:text-2xl">
              {summary.tied
                ? summary.concentrations.map(getConcentrationLabel).join(" / ")
                : getConcentrationLabel(summary.concentrations[0])}
            </p>

            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {summary.tied
                ? `Each of these was recommended to ${summary.count} students.`
                : `Recommended to ${summary.count} ${
                    summary.count === 1 ? "student" : "students"
                  }.`}
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {totalAssessments > 0
                ? `${Math.round((summary.count / totalAssessments) * 1000) / 10}% of all assessments.`
                : null}
            </p>

            {summary.tied ? (
              <p className="mt-4 rounded-md bg-brand-50 px-3 py-2 text-xs text-brand-800">
                Top recommendations are tied.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
}
