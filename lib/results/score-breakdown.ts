import type { Concentration } from "@/data/concentrations";
import { normalizeScore } from "@/lib/scoring/normalization";

/**
 * Score-transparency helpers.
 *
 * These rebuild, from the locked questionnaire version + stored answers, the
 * exact per-question weight contributions that produced a concentration's raw
 * and normalized score. Used by the student result page and the admin
 * assessment-detail page to show students/admins HOW a score was calculated.
 *
 * The reconstruction is deterministic and mirrors the authoritative scoring
 * pipeline (lib/scoring/score-assessment.ts): the selected option's weight for
 * the concentration is added per question, and the theoretical maximum is the
 * strongest weight the concentration could receive on each question, summed.
 */

/** One DB weight row on an option (concentration string keeps Prisma/legacy
 *  enum types out of this pure module). */
export type BreakdownOptionWeight = { concentration: string; weight: number };

export type BreakdownOption = {
  id: string;
  label: string;
  weights: readonly BreakdownOptionWeight[];
};

export type BreakdownQuestion = {
  id: string;
  order: number;
  text: string;
  options: readonly BreakdownOption[];
};

/** One stored answer row (questionId + selected option id). */
export type BreakdownAnswer = { questionId: string; answerKey: string };

/** One question's contribution to a concentration. */
export type ScoreBreakdownRow = {
  order: number;
  questionText: string;
  optionLabel: string;
  weight: number;
};

export type ScoreBreakdown = {
  concentration: Concentration;
  rows: readonly ScoreBreakdownRow[];
  /** Sum of the selected options' weights for this concentration. */
  rawScore: number;
  /** Sum of the strongest per-question weights for this concentration. */
  maxScore: number;
  /** normalizedScore = rawScore / maxScore * 100 (rounded to 1 decimal). */
  normalizedScore: number;
};

/**
 * Builds the full per-question score breakdown for one concentration.
 *
 * `questions` should already be ordered by `order`; the helper sorts anyway so
 * the output is deterministic regardless of call-site order.
 */
export function buildScoreBreakdown(params: {
  concentration: Concentration;
  questions: readonly BreakdownQuestion[];
  answers: readonly BreakdownAnswer[];
}): ScoreBreakdown {
  const { concentration } = params;
  const answerByQuestion = new Map(
    params.answers.map((answer) => [answer.questionId, answer.answerKey]),
  );

  const orderedQuestions = [...params.questions].sort(
    (a, b) => a.order - b.order,
  );

  let rawScore = 0;
  let maxScore = 0;
  const rows: ScoreBreakdownRow[] = [];

  for (const question of orderedQuestions) {
    const selectedOptionId = answerByQuestion.get(question.id);
    const selectedOption = selectedOptionId
      ? question.options.find((option) => option.id === selectedOptionId)
      : undefined;

    const selectedWeight = selectedOption
      ? selectedOption.weights.find((weight) => weight.concentration === concentration)
          ?.weight ?? 0
      : 0;

    // Theoretical max per question: the largest weight this concentration can
    // earn on this question (a student picks exactly one option).
    let questionMax = 0;
    for (const option of question.options) {
      const optionWeight =
        option.weights.find((weight) => weight.concentration === concentration)
          ?.weight ?? 0;
      if (optionWeight > questionMax) {
        questionMax = optionWeight;
      }
    }

    rawScore += selectedWeight;
    maxScore += questionMax;
    rows.push({
      order: question.order,
      questionText: question.text,
      optionLabel: selectedOption?.label ?? "Not answered",
      weight: selectedWeight,
    });
  }

  return {
    concentration,
    rows,
    rawScore,
    maxScore,
    normalizedScore: normalizeScore(rawScore, maxScore),
  };
}
