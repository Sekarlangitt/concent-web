import {
  informaticsQuestions,
  INFORMATICS_CONCENTRATIONS,
  type InformaticsConcentration,
  type InformaticsQuestion,
} from "@/data/informaticsQuestions";
import {
  informationSystemsQuestions,
  INFORMATION_SYSTEMS_CONCENTRATIONS,
  type InformationSystemsConcentration,
  type InformationSystemsQuestion,
} from "@/data/informationSystemsQuestions";
import type {
  QuestionnaireQuestion,
  QuestionType,
} from "@/data/questionTypes";

/**
 * Scoring utility foundation (STEP 4/5).
 *
 * These helpers inspect the questionnaire configurations: they compute the
 * maximum possible raw score per concentration, measure per-concentration
 * question coverage, and validate the whole configuration. They are used by
 * development checks, previews, and tests for BOTH majors.
 *
 * IMPORTANT: client-calculated recommendations are NOT authoritative. The
 * final scoring implementation (a later step) must recalculate from stored
 * answer IDs on the server. These utilities never produce a student
 * recommendation.
 */

/** Inclusive weight bounds used across the questionnaire. */
export const MIN_WEIGHT = 0;
export const MAX_WEIGHT = 5;

/** Score totals keyed by every Informatics concentration. */
export type InformaticsConcentrationTotals = Record<
  InformaticsConcentration,
  number
>;

/** Score totals keyed by every Information Systems concentration. */
export type InformationSystemsConcentrationTotals = Record<
  InformationSystemsConcentration,
  number
>;

/**
 * Maximum possible raw score per concentration (generic core).
 *
 * A student picks exactly one option per question, so the contribution a
 * single question can add to a concentration is the largest weight that
 * concentration appears with among that question's options (0 when absent).
 * Summing that across all questions yields the theoretical maximum raw score
 * per concentration — the basis for the later normalization step.
 *
 * The parameter type is intentionally structural (options with weights) so it
 * accepts both the legacy TypeScript question configuration and the
 * database-managed question shapes (lib/questionnaires).
 */
export function getMaxScoresForConcentrations<C extends string>(
  questions: readonly {
    options: readonly { weights: Partial<Record<C, number>> }[];
  }[],
  concentrations: readonly C[],
): Record<C, number> {
  const totals = {} as Record<C, number>;
  for (const concentration of concentrations) {
    totals[concentration] = 0;
  }

  for (const question of questions) {
    for (const concentration of concentrations) {
      let maxForQuestion = 0;
      for (const option of question.options) {
        const weight = option.weights[concentration] ?? 0;
        if (weight > maxForQuestion) {
          maxForQuestion = weight;
        }
      }
      totals[concentration] += maxForQuestion;
    }
  }

  return totals;
}

/** Maximum possible raw score per Informatics concentration. */
export function getMaxScoreByConcentration(
  questions: readonly InformaticsQuestion[] = informaticsQuestions,
): InformaticsConcentrationTotals {
  return getMaxScoresForConcentrations(questions, INFORMATICS_CONCENTRATIONS);
}

/** Maximum possible raw score per Information Systems concentration. */
export function getInformationSystemsMaxScores(
  questions: readonly InformationSystemsQuestion[] = informationSystemsQuestions,
): InformationSystemsConcentrationTotals {
  return getMaxScoresForConcentrations(
    questions,
    INFORMATION_SYSTEMS_CONCENTRATIONS,
  );
}

/**
 * Number of questions where each concentration can earn more than 0
 * (generic core).
 */
export function getConcentrationCoverageForConcentrations<C extends string>(
  questions: readonly {
    options: readonly { weights: Partial<Record<C, number>> }[];
  }[],
  concentrations: readonly C[],
): Record<C, number> {
  const counts = {} as Record<C, number>;
  for (const concentration of concentrations) {
    counts[concentration] = 0;
  }

  for (const question of questions) {
    for (const concentration of concentrations) {
      const canScore = question.options.some(
        (option) => (option.weights[concentration] ?? 0) > 0,
      );
      if (canScore) {
        counts[concentration] += 1;
      }
    }
  }

  return counts;
}

/** Number of Informatics questions where each concentration can score. */
export function getConcentrationCoverage(
  questions: readonly InformaticsQuestion[] = informaticsQuestions,
): InformaticsConcentrationTotals {
  return getConcentrationCoverageForConcentrations(
    questions,
    INFORMATICS_CONCENTRATIONS,
  );
}

/** Number of Information Systems questions where each concentration can score. */
export function getInformationSystemsCoverage(
  questions: readonly InformationSystemsQuestion[] = informationSystemsQuestions,
): InformationSystemsConcentrationTotals {
  return getConcentrationCoverageForConcentrations(
    questions,
    INFORMATION_SYSTEMS_CONCENTRATIONS,
  );
}

/** Count of questions per question type (works for either major). */
export function getQuestionTypeCounts(
  questions: readonly { type: QuestionType }[] = informaticsQuestions,
): Record<QuestionType, number> {
  const counts: Record<QuestionType, number> = {
    LIKERT: 0,
    AGREEMENT: 0,
    MULTIPLE_CHOICE: 0,
    SCENARIO: 0,
    PRIORITY: 0,
  };

  for (const question of questions) {
    counts[question.type] += 1;
  }

  return counts;
}

export type QuestionSetValidationConfig<C extends string> = {
  expectedCount: number;
  /** Display label used in error messages, e.g. "Informatics". */
  majorLabel: string;
  expectedMajor: string;
  /** Stable question id prefix, e.g. "INF" or "IS". */
  idPrefix: string;
  /** The only concentrations allowed to appear in this set's weights. */
  concentrations: readonly C[];
  /** Minimum questions where a concentration can score (default 6). */
  minCoveragePerConcentration?: number;
  /** Largest tolerated gap between concentration maxima (default 10). */
  maxMaxScoreRange?: number;
};

/**
 * Validates any major's questionnaire configuration and returns a list of
 * human-readable errors. An empty array means the configuration is valid.
 *
 * Checks: exact question count, stable/unique question ids, stable option
 * ids, non-empty text, supported question type, at least 2 options per
 * question, weights within 0–5, only the major's concentrations in weights,
 * meaningful per-concentration coverage, and balanced maximum scores.
 */
export function validateQuestionSet<C extends string>(
  questions: readonly QuestionnaireQuestion<C, string>[],
  config: QuestionSetValidationConfig<C>,
): string[] {
  const {
    expectedCount,
    majorLabel,
    expectedMajor,
    idPrefix,
    concentrations,
    minCoveragePerConcentration = 6,
    maxMaxScoreRange = 10,
  } = config;
  const errors: string[] = [];

  // Exactly the required number of questions.
  if (questions.length !== expectedCount) {
    errors.push(
      `Expected exactly ${expectedCount} ${majorLabel} questions, got ${questions.length}.`,
    );
  }

  const questionIds = new Set<string>();
  const validTypes: readonly QuestionType[] = [
    "LIKERT",
    "AGREEMENT",
    "MULTIPLE_CHOICE",
    "SCENARIO",
    "PRIORITY",
  ];

  for (const question of questions) {
    const label = question.id || "<missing id>";

    // Every question must belong to the expected major.
    if (question.major !== expectedMajor) {
      errors.push(
        `${label}: major must be "${expectedMajor}", got "${question.major}".`,
      );
    }

    // Question IDs must be unique and stable.
    if (!new RegExp(`^${idPrefix}_Q\\d{2}$`).test(question.id)) {
      errors.push(
        `${label}: question id does not match the stable pattern ${idPrefix}_Q01…${idPrefix}_Q20.`,
      );
    }
    if (questionIds.has(question.id)) {
      errors.push(`${label}: duplicate question id.`);
    }
    questionIds.add(question.id);

    // Question text must be present.
    if (!question.text || question.text.trim().length === 0) {
      errors.push(`${label}: question text must not be empty.`);
    }

    // Question type must be one of the supported types.
    if (!validTypes.includes(question.type)) {
      errors.push(`${label}: unsupported question type "${question.type}".`);
    }

    // At least two answer options.
    if (question.options.length < 2) {
      errors.push(`${label}: expected at least 2 answer options.`);
    }

    const optionIds = new Set<string>();
    for (const option of question.options) {
      // Option IDs must be unique within the question and stable.
      if (!new RegExp(`^${question.id}_[A-Z]$`).test(option.id)) {
        errors.push(
          `${label}: option id "${option.id}" does not match the stable pattern ${question.id}_A, ${question.id}_B, …`,
        );
      }
      if (optionIds.has(option.id)) {
        errors.push(`${label}: duplicate option id "${option.id}".`);
      }
      optionIds.add(option.id);

      if (!option.label || option.label.trim().length === 0) {
        errors.push(`${label}: option "${option.id}" must have a label.`);
      }

      for (const [concentration, weight] of Object.entries(option.weights)) {
        // Only the major's concentrations may appear in weights.
        if (!(concentrations as readonly string[]).includes(concentration)) {
          errors.push(
            `${label} / ${option.id}: invalid concentration "${concentration}" in weights.`,
          );
        }
        // Weights must be integers within [0, 5].
        const numericWeight = weight as number;
        if (
          !Number.isInteger(numericWeight) ||
          numericWeight < MIN_WEIGHT ||
          numericWeight > MAX_WEIGHT
        ) {
          errors.push(
            `${label} / ${option.id}: weight ${numericWeight} for ${concentration} is out of range ${MIN_WEIGHT}–${MAX_WEIGHT}.`,
          );
        }
      }
    }
  }

  // Every concentration must appear meaningfully across multiple questions.
  const coverage = getConcentrationCoverageForConcentrations(
    questions,
    concentrations,
  );
  for (const concentration of concentrations) {
    if (coverage[concentration] < minCoveragePerConcentration) {
      errors.push(
        `${concentration}: appears in only ${coverage[concentration]} question(s); expected at least ${minCoveragePerConcentration} for meaningful coverage.`,
      );
    }
  }

  // Maximum possible scores should be reasonably balanced.
  const maxima = getMaxScoresForConcentrations(questions, concentrations);
  const values = Object.values(maxima) as number[];
  const lowest = Math.min(...values);
  const highest = Math.max(...values);
  if (highest - lowest > maxMaxScoreRange) {
    errors.push(
      `Maximum possible scores are too unbalanced (range ${lowest}–${highest}). Normalization cannot compensate for a gap this large.`,
    );
  }

  return errors;
}

/**
 * Validates the Informatics questionnaire configuration and returns a list
 * of human-readable errors. An empty array means the configuration is valid.
 */
export function validateInformaticsQuestions(
  questions: readonly InformaticsQuestion[] = informaticsQuestions,
): string[] {
  return validateQuestionSet(questions, {
    expectedCount: 20,
    majorLabel: "Informatics",
    expectedMajor: "INFORMATICS",
    idPrefix: "INF",
    concentrations: INFORMATICS_CONCENTRATIONS,
  });
}

/** Throws an Error listing every Informatics configuration problem found. */
export function assertInformaticsQuestionsValid(
  questions: readonly InformaticsQuestion[] = informaticsQuestions,
): void {
  const errors = validateInformaticsQuestions(questions);
  if (errors.length > 0) {
    throw new Error(
      `Informatics questionnaire configuration is invalid:\n- ${errors.join("\n- ")}`,
    );
  }
}

/**
 * Validates the Information Systems questionnaire configuration and returns
 * a list of human-readable errors. An empty array means the configuration is
 * valid.
 */
export function validateInformationSystemsQuestions(
  questions: readonly InformationSystemsQuestion[] = informationSystemsQuestions,
): string[] {
  return validateQuestionSet(questions, {
    expectedCount: 20,
    majorLabel: "Information Systems",
    expectedMajor: "INFORMATION_SYSTEMS",
    idPrefix: "IS",
    concentrations: INFORMATION_SYSTEMS_CONCENTRATIONS,
  });
}

/** Throws an Error listing every Information Systems configuration problem. */
export function assertInformationSystemsQuestionsValid(
  questions: readonly InformationSystemsQuestion[] = informationSystemsQuestions,
): void {
  const errors = validateInformationSystemsQuestions(questions);
  if (errors.length > 0) {
    throw new Error(
      `Information Systems questionnaire configuration is invalid:\n- ${errors.join("\n- ")}`,
    );
  }
}
