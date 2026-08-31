import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteAssessmentButton } from "@/components/admin/assessments/DeleteAssessmentButton";
import { Card } from "@/components/ui/Card";
import { getConcentrationLabel } from "@/data/concentrations";
import {
  buildAssessmentListHref,
  parseAssessmentListParams,
} from "@/lib/admin/assessment-query";
import { getAssessmentDetail } from "@/lib/admin/assessments";
import {
  getAnswerCompleteness,
  QUESTION_TYPE_LABELS,
  resolveAssessmentAnswers,
  resolveConcentrationScores,
  UNRESOLVED_ANSWER_LABEL,
} from "@/lib/admin/assessment-detail";
import { requireAdmin } from "@/lib/auth/admin";
import { getMajorLabel } from "@/lib/major";
import { formatSuitabilityScore } from "@/lib/results/format-score";

export const metadata: Metadata = {
  title: "Assessment Details | President University",
  description: "Individual completed concentration assessment record.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/assessments/[id] — protected assessment detail (STEP 11).
 *
 * Loads the record server-side with its stored answers and concentration
 * scores, then renders a read-only review: student summary, per-concentration
 * scores (raw + normalized, marked Recommended), and all 20 answers resolved
 * to readable question/answer text. Stored values (recommendedConcentration,
 * recommendedScore) are displayed exactly as persisted — never rescored.
 *
 * Deleting is the only mutation and is available here too via the shared
 * DeleteAssessmentButton; after deletion the server action redirects back to
 * /admin/assessments so the admin never sits on a now-nonexistent route.
 */

export default async function AdminAssessmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const { id } = await params;
  const rawSearch = await searchParams;

  // Preserve the list context (q, major, concentration, sort, page) for the
  // "Back to Assessments" link. Every value is re-parsed and sanitized by the
  // shared query parser, so an arbitrary `back` value can never build an
  // unsafe link.
  const backParam = Array.isArray(rawSearch.back) ? rawSearch.back[0] : rawSearch.back;
  const backHref = buildAssessmentListHref(
    parseAssessmentListParams(
      Object.fromEntries(new URLSearchParams(backParam ?? "")),
    ),
  );

  let assessment;
  try {
    assessment = await getAssessmentDetail(id);
  } catch (error) {
    console.error("[admin/assessments] detail lookup failed", {
      assessmentId: id,
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return <AssessmentDetailLoadError />;
  }

  if (!assessment) {
    notFound();
  }

  const storedAnswers = assessment.answers.map((answer) => ({
    questionId: answer.questionId,
    answerKey: answer.answerKey,
    numericValue: answer.numericValue,
  }));
  const answerRows = resolveAssessmentAnswers(assessment.major, storedAnswers);
  const completeness = getAnswerCompleteness(assessment.major, storedAnswers.length);
  const scores = resolveConcentrationScores(
    assessment.major,
    assessment.recommendedConcentration,
    assessment.concentrationScores.map((score) => ({
      concentration: score.concentration,
      rawScore: score.rawScore,
      normalizedScore: score.normalizedScore,
    })),
  );

  const completedDateTime = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(assessment.completedAt ?? assessment.createdAt);

  return (
    <AssessmentDetailContent
      backHref={backHref}
      assessmentId={assessment.id}
      fullName={assessment.fullName}
      majorLabel={getMajorLabel(assessment.major)}
      completedDateTime={completedDateTime}
      recommendedLabel={getConcentrationLabel(assessment.recommendedConcentration)}
      recommendedScore={formatSuitabilityScore(assessment.recommendedScore)}
      confidenceLabel={assessment.confidenceLabel}
      scores={scores}
      answerRows={answerRows}
      completeness={completeness}
    />
  );
}

type DetailContentProps = {
  backHref: string;
  assessmentId: string;
  fullName: string;
  majorLabel: string;
  completedDateTime: string;
  recommendedLabel: string;
  recommendedScore: string;
  confidenceLabel: string | null;
  scores: ReturnType<typeof resolveConcentrationScores>;
  answerRows: ReturnType<typeof resolveAssessmentAnswers>;
  completeness: { expected: number; actual: number; complete: boolean };
};

function AssessmentDetailContent({
  backHref,
  assessmentId,
  fullName,
  majorLabel,
  completedDateTime,
  recommendedLabel,
  recommendedScore,
  confidenceLabel,
  scores,
  answerRows,
  completeness,
}: DetailContentProps) {
  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="focus-ring inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-brand-900 transition-colors hover:border-brand-300 hover:bg-brand-50"
      >
        ← Back to Assessments
      </Link>

      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Assessment Details
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Individual record for a completed concentration assessment. Read-only
          review of the stored answers and scores.
        </p>
      </header>

      {/* Student summary */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-semibold text-brand-900">Student Summary</h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <SummaryItem label="Student" value={fullName} />
          <SummaryItem label="Major" value={majorLabel} />
          <SummaryItem label="Completed" value={completedDateTime} />
          <SummaryItem label="Recommended Concentration" value={recommendedLabel} />
          <SummaryItem label="Suitability Score" value={recommendedScore} />
          {confidenceLabel ? (
            <SummaryItem label="Match Clarity" value={confidenceLabel} />
          ) : null}
        </dl>
        <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
          Assessment ID:{" "}
          <span className="font-mono text-slate-500">{assessmentId}</span>
        </p>
      </Card>


      {/* Concentration scores */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-semibold text-brand-900">
          Concentration Scores
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Raw and normalized scores for every concentration in this
          assessment&apos;s major, ordered by normalized score.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2.5">
                  Concentration
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Raw Score
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Normalized Score
                </th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score) => (
                <tr
                  key={score.concentration}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-800">
                        {getConcentrationLabel(score.concentration)}
                      </span>
                      {score.recommended ? (
                        <span className="rounded-full bg-brand-700 px-2.5 py-0.5 text-xs font-bold text-white">
                          Recommended
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {formatRawScore(score.rawScore)}
                  </td>
                  <td className="px-3 py-3 font-semibold text-brand-800">
                    {formatSuitabilityScore(score.normalizedScore)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stored answers */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-brand-900">Stored Answers</h2>
          <p className="text-sm text-slate-500">
            {completeness.actual} of {completeness.expected} stored
          </p>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          The 20 submitted answers in questionnaire order, resolved to readable
          question and answer text.
        </p>

        {!completeness.complete ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            This assessment contains incomplete or inconsistent stored answer
            data.
          </p>
        ) : null}

        <ol className="mt-4 space-y-3">
          {answerRows.map((row) => (
            <li
              key={row.questionId}
              className="rounded-lg border border-slate-100 bg-slate-50/60 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">
                  {row.questionNumber !== null
                    ? `Question ${row.questionNumber}`
                    : "Stored answer (orphan row)"}
                </p>
                {row.questionType ? (
                  <span className="text-xs text-slate-500">
                    {QUESTION_TYPE_LABELS[row.questionType]}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                {row.questionText}
              </p>
              {row.resolved && row.answerLabel ? (
                <p className="mt-2 text-sm font-medium text-brand-800">
                  {row.answerLabel}
                  {row.numericValue !== null ? (
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      Value {row.numericValue}
                    </span>
                  ) : null}
                </p>
              ) : (
                <div className="mt-2 rounded-md border border-dashed border-slate-300 bg-white px-3 py-2">
                  <p className="text-sm font-medium text-accent-700">
                    {UNRESOLVED_ANSWER_LABEL}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-slate-500">
                    questionId: {row.questionId} · answerKey:{" "}
                    {row.answerKey ?? "(missing)"}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ol>
      </Card>


      {/* Delete (only mutation — server-authorized) */}
      <Card className="border-accent-200 p-5 sm:p-6">
        <h2 className="text-base font-semibold text-accent-800">
          Delete Assessment
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Permanently remove this assessment record, including all saved answers
          and concentration scores. This action cannot be undone.
        </p>
        <div className="mt-4">
          <DeleteAssessmentButton
            assessmentId={assessmentId}
            studentName={fullName}
            context="detail"
          />
        </div>
      </Card>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function formatRawScore(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function AssessmentDetailLoadError() {
  return (
    <div className="rounded-2xl border border-accent-200 bg-accent-50 p-6 sm:p-8">
      <h2 className="text-base font-semibold text-accent-800">
        Assessment details could not be loaded
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-accent-700">
        Please try again.
      </p>
    </div>
  );
}
