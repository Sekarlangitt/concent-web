import { getProgressPercent } from "@/lib/progress";

type AssessmentProgressProps = {
  /** Zero-based index of the question currently displayed. */
  currentQuestionIndex: number;
  totalQuestions: number;
};

/**
 * Responsive progress bar with a visible textual "Question X of Y" label and
 * percentage for accessibility. Progress uses the canonical formula
 * `((currentQuestionIndex + 1) / totalQuestions) * 100`:
 * Question 1 → 5%, Question 5 → 25%, Question 10 → 50%,
 * Question 15 → 75%, Question 20 → 100% (for 20 questions).
 *
 * The bar exposes the percentage through role="progressbar" with
 * aria-valuemin="0", aria-valuemax="100", and aria-valuenow, so assistive
 * technology reads a 0–100 range and users never rely on color alone.
 */
export function AssessmentProgress({
  currentQuestionIndex,
  totalQuestions,
}: AssessmentProgressProps) {
  const questionNumber = currentQuestionIndex + 1;
  const percent = getProgressPercent(currentQuestionIndex, totalQuestions);

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-semibold text-slate-700">
          Question {questionNumber} of {totalQuestions}
        </p>
        <p className="text-sm tabular-nums text-slate-500">{percent}%</p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`Question ${questionNumber} of ${totalQuestions}`}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

