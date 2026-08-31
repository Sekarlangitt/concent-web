import Link from "next/link";

import { getConcentrationLabel } from "@/data/concentrations";
import { formatDashboardDate } from "@/lib/admin/dashboard-utils";
import { getMajorLabel } from "@/lib/major";
import { ADMIN_ASSESSMENTS_ROUTE } from "@/lib/auth/config";
import { formatSuitabilityScore } from "@/lib/results/format-score";
import type { AssessmentListRecord } from "@/lib/admin/assessments";

import { DeleteAssessmentButton } from "./DeleteAssessmentButton";

/**
 * STEP 11 assessment list rendering (server component).
 *
 * Desktop/tablet: a semantic <table> (thead/tbody, scope="col" headers) with
 * the columns Student Name · Major · Recommended Concentration · Suitability ·
 * Completed · Actions.
 *
 * Mobile (~375px): the same record rendered as a stacked card so a wide
 * six-column table is never forced horizontally. Each card shows the student
 * name, major, recommendation, suitability, date, and View/Delete actions.
 *
 * Both views share the exact same record props and delete implementation —
 * there is exactly one DeleteAssessmentButton flow.
 */

export function AssessmentTable({
  records,
  backQuery,
}: {
  records: AssessmentListRecord[];
  /** Serialized list query (q, major, concentration, sort, page) for the back link. */
  backQuery?: string;
}) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-4 py-3">
                Student Name
              </th>
              <th scope="col" className="px-4 py-3">
                Major
              </th>
              <th scope="col" className="px-4 py-3">
                Recommended Concentration
              </th>
              <th scope="col" className="px-4 py-3">
                Suitability
              </th>
              <th scope="col" className="px-4 py-3">
                Completed
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                key={record.id}
                className="border-b border-slate-100 last:border-b-0 hover:bg-brand-50/50"
              >
                <td className="max-w-[220px] px-4 py-3 font-medium text-slate-900">
                  <span className="break-words">{record.fullName}</span>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {getMajorLabel(record.major)}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  <span className="break-words">
                    {getConcentrationLabel(record.recommendedConcentration)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-brand-800">
                  {formatSuitabilityScore(record.recommendedScore)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {formatCompletionDate(record)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={detailHref(record.id, backQuery)}
                      aria-label={`View assessment for ${record.fullName}`}
                      className="focus-ring inline-flex min-h-[36px] items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-brand-900 transition-colors hover:border-brand-300 hover:bg-brand-50"
                    >
                      View
                    </Link>
                    <DeleteAssessmentButton
                      assessmentId={record.id}
                      studentName={record.fullName}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {/* Mobile cards */}
      <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm md:hidden">
        {records.map((record) => (
          <li key={record.id} className="flex flex-col gap-3 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-semibold text-slate-900">
                  {record.fullName}
                </p>
                <p className="mt-0.5 text-sm text-slate-600">
                  {getMajorLabel(record.major)}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-800">
                {formatSuitabilityScore(record.recommendedScore)}
              </span>
            </div>
            <p className="break-words text-sm text-slate-700">
              {getConcentrationLabel(record.recommendedConcentration)}
            </p>
            <p className="text-xs text-slate-500">{formatCompletionDate(record)}</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={detailHref(record.id, backQuery)}
                aria-label={`View assessment for ${record.fullName}`}
                className="focus-ring inline-flex min-h-[36px] items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-brand-900 transition-colors hover:border-brand-300 hover:bg-brand-50"
              >
                View Details
              </Link>
              <DeleteAssessmentButton
                assessmentId={record.id}
                studentName={record.fullName}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function detailHref(id: string, backQuery: string | undefined): string {
  return backQuery
    ? `${ADMIN_ASSESSMENTS_ROUTE}/${id}?back=${encodeURIComponent(backQuery)}`
    : `${ADMIN_ASSESSMENTS_ROUTE}/${id}`;
}

function formatCompletionDate(record: AssessmentListRecord): string {
  const date = record.completedAt ?? record.createdAt;
  return formatDashboardDate(date);
}
