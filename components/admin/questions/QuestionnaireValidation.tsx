import { getConcentrationLabel, type Concentration } from "@/data/concentrations";
import type { PublishValidationResult } from "@/lib/questionnaires/validation";

/**
 * Read-only questionnaire validation panel (admin).
 *
 * Shows the exactly-20 question status, per-concentration scoring coverage
 * and theoretical maxima, option/weight validity, and whether the draft is
 * ready to publish. Warnings (balance) are shown but never block publishing.
 */
export function QuestionnaireValidation({
  validation,
}: {
  validation: PublishValidationResult;
}) {
  const concentrations = Object.keys(
    validation.theoreticalMaxima,
  ) as Concentration[];

  const publishable =
    validation.valid && validation.questionCount === validation.expectedQuestionCount;

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 ${
        publishable
          ? "border-brand-200 bg-brand-50"
          : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <h2 className="text-base font-semibold text-brand-900">
        Questionnaire Validation
      </h2>

      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-slate-600">Questions</dt>
          <dd className="font-semibold text-slate-900">
            {validation.questionCount} / {validation.expectedQuestionCount}
          </dd>
        </div>

        <div>
          <dt className="text-slate-600">Concentration scoring coverage</dt>
          <dd className="mt-2 flex flex-wrap gap-2">
            {concentrations.map((concentration) => {
              const maximum = validation.theoreticalMaxima[concentration] ?? 0;
              const covered = maximum > 0;
              return (
                <span
                  key={concentration}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                    covered
                      ? "border-brand-200 bg-white text-brand-800"
                      : "border-accent-200 bg-accent-50 text-accent-700"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={covered ? "text-brand-600" : "text-accent-600"}
                  >
                    {covered ? "✓" : "✕"}
                  </span>
                  {getConcentrationLabel(concentration)}
                  <span className="font-normal text-slate-500">
                    (max {maximum})
                  </span>
                </span>
              );
            })}
          </dd>
        </div>

        <div>
          <dt className="text-slate-600">Theoretical maximum scores</dt>
          <dd className="mt-1 text-xs leading-relaxed text-slate-500">
            The highest raw score each concentration could receive in this
            questionnaire (best option per question, summed). Normalization
            divides raw scores by these maxima.
          </dd>
        </div>
      </dl>

      {validation.warnings.length > 0 ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">Warnings</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-700">
            {validation.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {validation.errors.length > 0 ? (
        <div className="mt-4 rounded-lg border border-accent-200 bg-accent-50 px-4 py-3">
          <p className="text-sm font-semibold text-accent-800">
            Publishing is blocked until these are fixed:
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-accent-700">
            {validation.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-4 text-sm font-semibold">
        {publishable ? (
          <span className="text-brand-800">Ready to publish.</span>
        ) : (
          <span className="text-accent-700">Not ready to publish.</span>
        )}
      </p>
    </div>
  );
}
