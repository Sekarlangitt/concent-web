import { Card } from "@/components/ui/Card";
import { StartNewAssessmentButton } from "@/components/results/StartNewAssessmentButton";

/**
 * Clean, student-facing error state shown when a stored result exists but
 * cannot be displayed completely (database failure, missing score rows, or a
 * recommended concentration that is incompatible with the recorded major).
 * The technical issue is always logged server-side before this renders.
 */
export function ResultLoadError() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <Card className="p-6 text-center sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">
          President University
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          This result could not be loaded completely
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-slate-700">
          We could not display this assessment result right now. Please try
          opening the link again, or start a new assessment.
        </p>
        <div className="mt-8 flex justify-center">
          <StartNewAssessmentButton />
        </div>
      </Card>
    </section>
  );
}
