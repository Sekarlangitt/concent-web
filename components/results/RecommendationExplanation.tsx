import { Card } from "@/components/ui/Card";
import type { ResultExplanation } from "@/lib/results/generate-explanation";

type RecommendationExplanationProps = {
  explanation: ResultExplanation;
};

/**
 * Deterministic recommendation explanation: one concise paragraph, the
 * strongest response themes derived from the student's stored answers, and —
 * when relevant — secondary-concentration and close-match notes.
 */
export function RecommendationExplanation({
  explanation,
}: RecommendationExplanationProps) {
  return (
    <Card className="p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-brand-900">
        Why This Recommendation
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base">
        {explanation.summary}
      </p>

      {explanation.strengths.length > 0 ? (
        <div className="mt-5">
          <p className="text-sm font-medium text-slate-700">
            Your responses showed strong interest in:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
            {explanation.strengths.map((strength) => (
              <li key={strength}>{strength}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {explanation.secondaryNote ? (
        <p className="mt-5 text-sm leading-relaxed text-slate-700">
          {explanation.secondaryNote}
        </p>
      ) : null}

      {explanation.closeMatchNote ? (
        <p className="mt-5 rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm leading-relaxed text-brand-900">
          {explanation.closeMatchNote}
        </p>
      ) : null}
    </Card>
  );
}
