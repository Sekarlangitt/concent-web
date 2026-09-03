import { Card } from "@/components/ui/Card";
import {
  getConcentrationLabel,
  type Concentration,
} from "@/data/concentrations";
import {
  buildScoreBreakdown,
  type BreakdownAnswer,
  type BreakdownQuestion,
} from "@/lib/results/score-breakdown";
import { formatSuitabilityScore } from "@/lib/results/format-score";

type ScoreCalculationScore = {
  concentration: Concentration;
  rawScore: number;
  normalizedScore: number;
};

type ScoreCalculationCardProps = {
  scores: readonly ScoreCalculationScore[];
  recommendedConcentration: Concentration;
  /**
   * The questionnaire version's questions (with per-option weight rows). When
   * omitted/null (legacy pre-versioning assessments) only the plain-language
   * formula explanation is shown — there is no trustworthy weight data to
   * display.
   */
  questions?: readonly BreakdownQuestion[] | null;
  /** Stored answers (questionId → selected option id). */
  answers?: readonly BreakdownAnswer[] | null;
};

function formatRaw(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function weightChip(weight: number): string {
  if (weight === 0) {
    return "bg-slate-100 text-slate-400";
  }
  if (weight <= 2) {
    return "bg-slate-200/80 text-slate-600";
  }
  if (weight === 3) {
    return "bg-brand-100 text-brand-800";
  }
  return "bg-accent-100 text-accent-800";
}

/**
 * Plain-language "how the score was calculated" transparency card.
 *
 * Shows the formula, a short example, the 0–5 weight legend, and — whenever
 * the locked questionnaire version is available — an expandable list per
 * concentration with the REAL per-question weights of the options the student
 * picked (the recommended concentration is expanded by default). Used on the
 * student result page and the admin assessment-detail page.
 */
export function ScoreCalculationCard({
  scores,
  recommendedConcentration,
  questions,
  answers,
}: ScoreCalculationCardProps) {
  const hasDetail = Boolean(
    questions && questions.length > 0 && answers && answers.length > 0,
  );
  const sorted = [...scores].sort((a, b) => {
    if (a.normalizedScore !== b.normalizedScore) {
      return b.normalizedScore - a.normalizedScore;
    }
    if (a.rawScore !== b.rawScore) {
      return b.rawScore - a.rawScore;
    }
    return getConcentrationLabel(a.concentration).localeCompare(
      getConcentrationLabel(b.concentration),
    );
  });

  return (
    <Card className="p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-brand-900">
        How Your Score Is Calculated
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base">
        Your score is not a test grade. Every answer option carries a hidden
        &ldquo;weight&rdquo; (0–5) for each concentration — how strongly that
        choice points toward the field. Your score is the total of those
        weights, shown as a percentage of the maximum score that concentration
        could reach.
      </p>

      <ol className="mt-4 space-y-2">
        <li className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
            1
          </span>
          <span>
            For each of the 20 questions, take the weight of the option you
            selected (0 = no signal, 1–2 = weak, 3 = moderate, 4–5 = strong).
          </span>
        </li>
        <li className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
            2
          </span>
          <span>
            Add the weights together — that is your{" "}
            <strong>raw score</strong> for the concentration.
          </span>
        </li>
        <li className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
            3
          </span>
          <span>
            Divide by the <strong>maximum possible raw score</strong> (what you
            would get if you picked the strongest option on every question),
            then multiply by 100.
          </span>
        </li>
      </ol>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          The Formula
        </p>
        <p className="mt-1 font-mono text-sm text-slate-800">
          score = (your raw score ÷ maximum possible) × 100
        </p>
        <p className="mt-1 font-mono text-xs text-slate-500">
          example: (42 ÷ 69) × 100 = 60.9%
        </p>
      </div>

      <p className="mt-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-xs leading-relaxed text-brand-900">
        Weight guide: <span className="font-semibold">0</span> = no signal ·{" "}
        <span className="font-semibold">1–2</span> = weak ·{" "}
        <span className="font-semibold">3</span> = moderate ·{" "}
        <span className="font-semibold">4–5</span> = strong
      </p>

      {hasDetail ? (
        <div className="mt-6 space-y-3">
          {sorted.map((score) => {
            const isRecommended =
              score.concentration === recommendedConcentration;
            const breakdown = buildScoreBreakdown({
              concentration: score.concentration,
              questions: questions as readonly BreakdownQuestion[],
              answers: answers as readonly BreakdownAnswer[],
            });
            const label = getConcentrationLabel(score.concentration);
            return (
              <details
                key={score.concentration}
                open={isRecommended}
                className="group rounded-xl border border-slate-200 bg-white open:shadow-sm"
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 select-none">
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">
                      {label}
                    </span>
                    {isRecommended ? (
                      <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Recommended
                      </span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-sm">
                    <span className="font-mono font-semibold text-slate-700">
                      {formatRaw(breakdown.rawScore)}
                    </span>
                    <span className="text-slate-400">
                      / {formatRaw(breakdown.maxScore)}
                    </span>
                    <span className="rounded-md bg-brand-50 px-2 py-0.5 font-bold tabular-nums text-brand-700">
                      {formatSuitabilityScore(breakdown.normalizedScore)}
                    </span>
                  </span>
                </summary>
                <div className="border-t border-slate-100 px-4 py-3">
                  <p className="mb-3 text-xs text-slate-500">
                    Every question, the option you chose, and how many points it
                    added to {label}.
                  </p>
                  <ol className="space-y-1">
                    {breakdown.rows.map((row) => (
                      <li
                        key={row.order}
                        className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-3 rounded-lg px-1 py-1.5 hover:bg-slate-50"
                      >
                        <span className="pt-0.5 text-xs font-semibold text-slate-400">
                          Q{row.order}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm leading-snug text-slate-700 line-clamp-2">
                            {row.questionText}
                          </span>
                          <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                            Your answer: {row.optionLabel}
                          </span>
                        </span>
                        <span
                          className={`inline-flex min-w-9 items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${weightChip(row.weight)}`}
                        >
                          {row.weight > 0 ? `+${row.weight}` : "0"}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
                    Add the +points column to get the raw score (
                    {formatRaw(breakdown.rawScore)}). The maximum (
                    {formatRaw(breakdown.maxScore)}) is what the concentration
                    would reach if the strongest option were chosen on every
                    question.
                  </p>
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
          Detailed per-question weight breakdown is not available for older
          assessments recorded before questionnaire versioning. The score above
          still follows the same formula.
        </p>
      )}

    </Card>
  );
}
