import { getMajorLabel, type Major } from "@/lib/major";

type AssessmentStudentSummaryProps = {
  fullName: string;
  major: Major;
  /** Valid answer count, shown as "Answered Questions: X of Y" when provided. */
  answeredCount?: number;
  /** Total questions for the major (e.g. 20). */
  totalQuestions?: number;
};

/**
 * Compact, non-dominant summary of who is taking the assessment:
 *
 *   Student: Budi Santoso | Major: Informatics
 *
 * Optionally includes an answered-question count for the review screen:
 *
 *   … | Answered Questions: 13 of 20
 *
 * Deliberately small and muted so the question list stays the visual focus.
 */
export function AssessmentStudentSummary({
  fullName,
  major,
  answeredCount,
  totalQuestions,
}: AssessmentStudentSummaryProps) {
  const showAnsweredCount =
    typeof answeredCount === "number" && typeof totalQuestions === "number";

  return (
    <dl className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
      <div className="flex items-baseline gap-1.5">
        <dt className="font-medium text-slate-500">Student:</dt>
        <dd className="font-semibold text-slate-800">{fullName}</dd>
      </div>
      <span aria-hidden="true" className="text-slate-300">
        |
      </span>
      <div className="flex items-baseline gap-1.5">
        <dt className="font-medium text-slate-500">Major:</dt>
        <dd className="font-semibold text-slate-800">{getMajorLabel(major)}</dd>
      </div>
      {showAnsweredCount ? (
        <>
          <span aria-hidden="true" className="text-slate-300">
            |
          </span>
          <div className="flex items-baseline gap-1.5">
            <dt className="font-medium text-slate-500">Answered Questions:</dt>
            <dd className="font-semibold text-slate-800">
              {answeredCount} of {totalQuestions}
            </dd>
          </div>
        </>
      ) : null}
    </dl>
  );
}

