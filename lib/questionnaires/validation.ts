import { CONCENTRATIONS_BY_MAJOR, type Concentration } from "@/data/concentrations";
import { QUESTIONS_PER_MAJOR } from "@/lib/major";
import type {
  QuestionShape,
  QuestionnaireVersionShape,
} from "@/lib/questionnaires/types";

/**
 * Pure questionnaire validation (admin publish gate + admin panel display).
 *
 * These functions never touch the database or the network — they inspect a
 * loaded questionnaire version shape and report every problem. The publish
 * server action re-runs this validation inside the publish transaction so a
 * race cannot publish an invalid questionnaire.
 *
 * Validation rules (requirements 31–34):
 *  - exactly 20 questions per published version;
 *  - deterministic, gap-free question order (1..N, unique);
 *  - every question has non-empty text and a supported type;
 *  - every question has at least 2 options;
 *  - deterministic, gap-free option order within each question;
 *  - every option has a non-empty label;
 *  - every weight is an integer in 0–5;
 *  - weights only target concentrations belonging to the question's major;
 *  - every concentration has a theoretical maximum > 0 (it can actually
 *    receive points somewhere in the questionnaire).
 */

/** Inclusive integer weight bounds (mirrors lib/scoring-utils). */
export const MIN_WEIGHT = 0;
export const MAX_WEIGHT = 5;

export type PublishValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  questionCount: number;
  expectedQuestionCount: number;
  /** Number of questions where each concentration can earn a weight > 0. */
  coverage: Partial<Record<Concentration, number>>;
  /** Theoretical maximum raw score per concentration. */
  theoreticalMaxima: Partial<Record<Concentration, number>>;
};

const SUPPORTED_QUESTION_TYPES = new Set<string>([
  "LIKERT",
  "AGREEMENT",
  "MULTIPLE_CHOICE",
  "SCENARIO",
  "PRIORITY",
]);

/**
 * Theoretical maximum raw score per concentration: the highest weight a
 * concentration can receive on each question (one answer per question),
 * summed across the questionnaire.
 */
export function computeTheoreticalMaxima(
  questions: readonly QuestionShape[],
  concentrations: readonly Concentration[],
): Partial<Record<Concentration, number>> {
  const maxima: Partial<Record<Concentration, number>> = {};
  for (const concentration of concentrations) {
    maxima[concentration] = 0;
  }
  for (const question of questions) {
    for (const concentration of concentrations) {
      let best = 0;
      for (const option of question.options) {
        const weight = option.weights[concentration] ?? 0;
        if (weight > best) {
          best = weight;
        }
      }
      maxima[concentration] = (maxima[concentration] ?? 0) + best;
    }
  }
  return maxima;
}

/** Number of questions where each concentration can earn a weight > 0. */
export function computeConcentrationCoverage(
  questions: readonly QuestionShape[],
  concentrations: readonly Concentration[],
): Partial<Record<Concentration, number>> {
  const coverage: Partial<Record<Concentration, number>> = {};
  for (const concentration of concentrations) {
    coverage[concentration] = 0;
  }
  for (const question of questions) {
    for (const concentration of concentrations) {
      const canScore = question.options.some(
        (option) => (option.weights[concentration] ?? 0) > 0,
      );
      if (canScore) {
        coverage[concentration] = (coverage[concentration] ?? 0) + 1;
      }
    }
  }
  return coverage;
}

/** True when `orders` are exactly 1..orders.length with no duplicates. */
export function hasGapFreeOrders(orders: readonly number[]): boolean {
  if (orders.length === 0) {
    return false;
  }
  const sorted = [...orders].sort((a, b) => a - b);
  return sorted.every((order, index) => order === index + 1);
}

/**
 * Validates a questionnaire version for publication. Returns an explicit list
 * of human-readable errors (empty = publishable) plus metadata used by the
 * admin validation panel (coverage, theoretical maxima, warnings).
 */
export function validateQuestionnaireForPublish(
  version: QuestionnaireVersionShape,
): PublishValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { major, questions } = version;
  const concentrations = CONCENTRATIONS_BY_MAJOR[major];
  const concentrationSet = new Set<Concentration>(concentrations);

  const questionCount = questions.length;
  if (questionCount !== QUESTIONS_PER_MAJOR) {
    errors.push(
      `The questionnaire must contain exactly ${QUESTIONS_PER_MAJOR} questions; it currently has ${questionCount}.`,
    );
  }

  const questionOrders = questions.map((question) => question.order);
  if (!hasGapFreeOrders(questionOrders)) {
    errors.push(
      "Question order must be deterministic (1, 2, 3, … with no duplicates).",
    );
  }

  for (const question of questions) {
    const label = `Question ${question.order} (${question.id})`;

    if (!question.text || question.text.trim().length === 0) {
      errors.push(`${label}: question text must not be empty.`);
    }
    if (!SUPPORTED_QUESTION_TYPES.has(question.type)) {
      errors.push(`${label}: unsupported question type "${question.type}".`);
    }
    if (question.options.length < 2) {
      errors.push(`${label}: must have at least 2 answer options.`);
    }
    if (!hasGapFreeOrders(question.options.map((option) => option.order))) {
      errors.push(`${label}: option order must be deterministic (1, 2, 3, …).`);
    }
    for (const option of question.options) {
      if (!option.label || option.label.trim().length === 0) {
        errors.push(`${label}: every answer option must have a label.`);
      }
      for (const [concentration, weight] of Object.entries(option.weights)) {
        const target = concentration as Concentration;
        if (!concentrationSet.has(target)) {
          errors.push(
            `${label} / option ${option.order}: "${target}" does not belong to the ${major} major.`,
          );
          continue;
        }
        if (
          !Number.isInteger(weight) ||
          weight < MIN_WEIGHT ||
          weight > MAX_WEIGHT
        ) {
          errors.push(
            `${label} / option ${option.order}: weight ${weight} for ${target} is outside the allowed range ${MIN_WEIGHT}–${MAX_WEIGHT}.`,
          );
        }
      }
    }
  }

  const theoreticalMaxima = computeTheoreticalMaxima(questions, concentrations);
  const coverage = computeConcentrationCoverage(questions, concentrations);

  // Requirement 32: every concentration must be able to receive points.
  for (const concentration of concentrations) {
    const maximum = theoreticalMaxima[concentration] ?? 0;
    if (maximum <= 0) {
      errors.push(
        `${concentration} currently has no scoring opportunities in this questionnaire.`,
      );
    }
  }

  // Requirement 34: balance warning (never a hard block for reasonable gaps).
  const maximaValues = concentrations
    .map((concentration) => theoreticalMaxima[concentration] ?? 0)
    .filter((value) => value > 0);
  if (maximaValues.length > 1) {
    const lowest = Math.min(...maximaValues);
    const highest = Math.max(...maximaValues);
    if (highest - lowest > 10) {
      warnings.push(
        `Theoretical maximum scores are spread from ${lowest} to ${highest}. Normalization handles this, but consider rebalancing weights.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    questionCount,
    expectedQuestionCount: QUESTIONS_PER_MAJOR,
    coverage,
    theoreticalMaxima,
  };
}
