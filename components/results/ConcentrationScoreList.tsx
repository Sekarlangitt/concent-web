import { Card } from "@/components/ui/Card";
import { ConcentrationScoreBar } from "@/components/results/ConcentrationScoreBar";
import type { Concentration } from "@/data/concentrations";

type ConcentrationScoreListProps = {
  scores: ReadonlyArray<{ concentration: Concentration; normalizedScore: number }>;
  recommendedConcentration: Concentration;
};

/**
 * All normalized concentration scores for the student's major, sorted
 * descending with the recommended concentration clearly identified. Only the
 * winning concentration receives the Recommended badge.
 */
export function ConcentrationScoreList({
  scores,
  recommendedConcentration,
}: ConcentrationScoreListProps) {
  return (
    <Card className="p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-brand-900">
        Your Scores by Concentration
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Scores are normalized to a 0–100 scale and ordered from highest to
        lowest match.
      </p>
      <dl className="mt-6 space-y-6">
        {scores.map((score) => (
          <ConcentrationScoreBar
            key={score.concentration}
            concentration={score.concentration}
            normalizedScore={score.normalizedScore}
            recommended={score.concentration === recommendedConcentration}
          />
        ))}
      </dl>
    </Card>
  );
}
