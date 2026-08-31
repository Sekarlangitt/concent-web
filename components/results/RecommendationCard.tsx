import { Card } from "@/components/ui/Card";
import {
  getConcentrationLabel,
  type Concentration,
} from "@/data/concentrations";
import { getConfidenceExplanation } from "@/lib/results/result-utils";

type RecommendationCardProps = {
  concentration: Concentration;
  /** Pre-formatted suitability score, e.g. "84.5%". */
  suitabilityScore: string;
  /** Stored confidence label ("High" | "Moderate" | "Close Match"), or null. */
  confidenceLabel: string | null;
};

/**
 * The strongest visual element of the result page: the recommended
 * concentration, its suitability score, and — when STEP 7 stored one — the
 * match-clarity label with a short, non-technical explanation.
 */
export function RecommendationCard({
  concentration,
  suitabilityScore,
  confidenceLabel,
}: RecommendationCardProps) {
  const confidence = getConfidenceExplanation(confidenceLabel);

  return (
    <Card className="p-6 sm:p-8">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-accent-600">
        Your Recommendation
      </p>
      <h2 className="mt-2 text-center text-2xl font-bold tracking-tight text-brand-900 sm:text-3xl">
        {getConcentrationLabel(concentration)}
      </h2>

      <div className="mx-auto mt-6 max-w-sm rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
        <p className="text-sm font-medium text-slate-500">Suitability Score</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-accent-600 sm:text-4xl">
          {suitabilityScore}
        </p>
      </div>

      {confidence ? (
        <div className="mx-auto mt-5 max-w-sm text-center">
          <p className="text-sm font-semibold text-slate-700">
            Match Clarity:{" "}
            <span className="font-bold text-brand-700">{confidence.label}</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {confidence.explanation}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
