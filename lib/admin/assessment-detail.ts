import type { Concentration } from "@/data/concentrations";
import type { QuestionType } from "@/data/questionTypes";
import { QUESTIONS_PER_MAJOR, type Major } from "@/lib/major";
import { getQuestionsForMajor } from "@/lib/questionnaire";
import {
  filterScoresForMajor,
  sortScoresDesc,
  type ResultScore,
} from "@/lib/results/result-utils";

/**
 * STEP 11 assessment detail helpers (pure, framework-neutral).
 *
 * The detail page loads the Assessment with its stored AssessmentAnswer and
 * ConcentrationScore rows, then uses these helpers to turn stored IDs into
 * human-readable review data:
 *
 *  - `resolveAssessmentAnswers` resolves stored (questionId, answerKey) pairs
 *    against the trusted TypeScript question configuration, in original
 *    questionnaire order, and never crashes on unknown/corrupt entries.
 *  - `getAnswerCompleteness` flags a stored answer count that differs from the
 *    expected 20 questions.
 *  - `resolveConcentrationScores` keeps only the major's valid concentrations,
 *    sorts by normalized score descending (reusing the result-page helpers),
 *    and marks the recommended winner.
 */

/** The minimal stored answer row shape (superset of Prisma's AssessmentAnswer). */
export type StoredAnswerRow = {
  questionId: string;
  answerKey: string;
  numericValue: number | null;
};

export type ResolvedAnswerRow = {
  questionId: string;
  /** 1-based position in the questionnaire, or null for orphan stored rows. */
  questionNumber: number | null;
  questionType: QuestionType | null;
  questionText: string | null;
  answerKey: string | null;
  /** Human-readable option label, or null when the stored key cannot be resolved. */
  answerLabel: string | null;
  numericValue: number | null;
  resolved: boolean;
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  LIKERT: "Likert scale",
  AGREEMENT: "Agreement",
  MULTIPLE_CHOICE: "Multiple choice",
  SCENARIO: "Scenario",
  PRIORITY: "Priority",
};

export const UNRESOLVED_ANSWER_LABEL = "Unable to resolve stored answer";

/**
 * Resolves stored answer rows to readable review rows for the assessment's
 * major. Every question from the trusted configuration is present in order
 * (unanswered ones render as unresolved); any stored row whose questionId is
 * not part of that configuration is appended as an orphan row so admins can
 * still inspect corrupt data instead of the page crashing.
 */
export function resolveAssessmentAnswers(
  major: Major,
  answers: readonly StoredAnswerRow[],
): ResolvedAnswerRow[] {
  const questions = getQuestionsForMajor(major);
  const answersByQuestionId = new Map(
    answers.map((answer) => [answer.questionId, answer]),
  );

  const rows: ResolvedAnswerRow[] = questions.map((question, index) => {
    const stored = answersByQuestionId.get(question.id);
    if (!stored) {
      return {
        questionId: question.id,
        questionNumber: index + 1,
        questionType: question.type,
        questionText: question.text,
        answerKey: null,
        answerLabel: null,
        numericValue: null,
        resolved: false,
      };
    }

    const option = question.options.find((candidate) => candidate.id === stored.answerKey);
    return {
      questionId: question.id,
      questionNumber: index + 1,
      questionType: question.type,
      questionText: question.text,
      answerKey: stored.answerKey,
      answerLabel: option ? option.label : null,
      numericValue: stored.numericValue ?? null,
      resolved: option !== undefined,
    };
  });

  const knownQuestionIds = new Set(questions.map((question) => question.id));
  const orphanRows: ResolvedAnswerRow[] = answers
    .filter((answer) => !knownQuestionIds.has(answer.questionId))
    .map((answer) => ({
      questionId: answer.questionId,
      questionNumber: null,
      questionType: null,
      questionText: null,
      answerKey: answer.answerKey,
      answerLabel: null,
      numericValue: answer.numericValue ?? null,
      resolved: false,
    }));

  return [...rows, ...orphanRows];
}

/**
 * Answer completeness check. A valid completed assessment stores exactly 20
 * answers; any other count triggers an admin warning (the detail page never
 * invents missing answers).
 */
export function getAnswerCompleteness(
  major: Major,
  storedAnswerCount: number,
): { expected: number; actual: number; complete: boolean } {
  const expected = QUESTIONS_PER_MAJOR;
  return {
    expected,
    actual: storedAnswerCount,
    complete: storedAnswerCount === expected,
  };
}

/** One resolved concentration score row for the detail page. */
export type ResolvedConcentrationScore = {
  concentration: Concentration;
  rawScore: number;
  normalizedScore: number;
  recommended: boolean;
};

/**
 * Builds the detail page's score list: drops cross-major rows, sorts by
 * normalized score descending (raw desc, then display label, matching the
 * result page), and marks the stored recommended concentration.
 */
export function resolveConcentrationScores(
  major: Major,
  recommendedConcentration: Concentration,
  scores: readonly {
    concentration: Concentration;
    rawScore: number;
    normalizedScore: number;
  }[],
): ResolvedConcentrationScore[] {
  const resultScores: ResultScore[] = scores.map((score) => ({
    concentration: score.concentration,
    rawScore: score.rawScore,
    normalizedScore: score.normalizedScore,
  }));

  const valid = filterScoresForMajor(resultScores, major);
  const sorted = sortScoresDesc(valid);

  return sorted.map((score) => ({
    concentration: score.concentration,
    rawScore: score.rawScore,
    normalizedScore: score.normalizedScore,
    recommended: score.concentration === recommendedConcentration,
  }));
}
