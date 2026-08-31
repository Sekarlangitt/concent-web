import {
  getConcentrationLabel,
  type Concentration,
} from "@/data/concentrations";
import { formatSuitabilityScore } from "@/lib/results/format-score";

type ConcentrationScoreBarProps = {
  concentration: Concentration;
  /** Stored normalized score (0–100). */
  normalizedScore: number;
  /** True only for the recommended (winning) concentration. */
  recommended?: boolean;
};

/**
 * One horizontal score bar for a concentration. The numeric score is always
 * visible as text and the bar itself carries an accessible name, so the score
 * is never communicated by width or color alone.
 */
export function ConcentrationScoreBar({
  concentration,
  normalizedScore,
  recommended = false,
}: ConcentrationScoreBarProps) {
  const label = getConcentrationLabel(concentration);
  const formatted = formatSuitabilityScore(normalizedScore);
  const percent = Math.min(100, Math.max(0, normalizedScore));

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <dt className="flex min-w-0 flex-wrap items-center gap-x-2">
          <span className="text-sm font-medium text-slate-800 sm:text-base">
            {label}
          </span>
          {recommended ? (
            <span className="rounded-full bg-accent-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Recommended
            </span>
          ) : null}
        </dt>
        <dd className="text-sm font-bold tabular-nums text-slate-900 sm:text-base">
          {formatted}
        </dd>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`${label} suitability score ${formatted.replace("%", "")} percent`}
        className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-brand-600"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
