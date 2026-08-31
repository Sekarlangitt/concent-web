import { Button } from "@/components/ui/Button";

type AssessmentNavigationProps = {
  onPrevious: () => void;
  onNext: () => void;
  isFirst: boolean;
  nextLabel: string;
  /** Friendly validation message shown above the buttons. */
  errorMessage?: string;
  /**
   * Renders only the primary action (used for "Save & Return to Review" in
   * edit-from-review mode, where the student should not be pushed through
   * the remaining questions again).
   */
  primaryOnly?: boolean;
};

/**
 * Previous / Next controls for the one-question-at-a-time flow.
 * "Previous" is disabled on the first question; on the final question the
 * primary button turns into "Review Answers". In edit mode (primaryOnly) the
 * secondary "Previous" button is hidden so the student is not forced through
 * the later questions and returns to the review page directly.
 */
export function AssessmentNavigation({
  onPrevious,
  onNext,
  isFirst,
  nextLabel,
  errorMessage,
  primaryOnly = false,
}: AssessmentNavigationProps) {
  return (
    <div className="w-full">
      {errorMessage ? (
        <p
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-lg border border-accent-200 bg-accent-50 px-3 py-2 text-sm font-medium text-accent-800"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="mt-0.5 h-4 w-4 shrink-0 text-accent-600"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
          <span>{errorMessage}</span>
        </p>
      ) : null}

      <div
        className={
          primaryOnly
            ? "flex flex-col gap-3"
            : "flex flex-col gap-3 sm:flex-row-reverse"
        }
      >
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={onNext}
          className="w-full sm:flex-1"
        >
          {nextLabel}
        </Button>
        {primaryOnly ? null : (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={onPrevious}
            disabled={isFirst}
            className="w-full sm:flex-1"
          >
            Previous
          </Button>
        )}
      </div>
    </div>
  );
}
