import "server-only";

import type { Concentration } from "@/data/concentrations";
import type { Major } from "@/lib/major";
import { getMaxScoresForConcentrations } from "@/lib/scoring-utils";
import { getConfidenceLabel } from "@/lib/scoring/confidence";
import { normalizeScore, roundScore } from "@/lib/scoring/normalization";
import {
  resolveTieBreak,
  type TieBreakContext,
} from "@/lib/scoring/tie-break";
import type {
  AssessmentScoreResult,
  ExplanationMetadata,
  ScoredConcentration,
  ScoreQuestion,
  ScoreQuestionSet,
  ValidatedAnswer,
} from "@/lib/scoring/types";

/**
 * Pure, server-safe assessment scoring (STEP 7, database-questionnaire edition).
 *
 * `scoreAssessment` is the authoritative scoring pipeline:
 *
 *   1. Validate every submitted answer against the trusted question set
 *      (loaded from the QuestionnaireVersion the student was locked to).
 *   2. Accumulate trusted database weights into per-concentration raw scores.
 *   3. Compute theoretical maximum scores from the question set.
 *   4. Normalize each concentration independently to 0–100.
 *   5. Rank deterministically (normalized desc, then documented tie logic).
 *   6. Determine the recommendation, its score, and a deterministic
 *      confidence label.
 *
 * The question set is an explicit argument — the caller (the API route) loads
 * it from PostgreSQL. This module never imports hardcoded question data.
 *
 * No Prisma calls live here — persistence is orchestrated by the route
 * handler inside a single transaction.
 */

/** Error thrown for any malformed/missing answer set. `message` is student-safe. */
export class AssessmentSubmissionError extends Error {
  readonly code:
    | "questionnaire-misconfigured"
    | "incomplete"
    | "invalid-answer";

  constructor(
    code: AssessmentSubmissionError["code"],
    message: string,
  ) {
    super(message);
    this.name = "AssessmentSubmissionError";
    this.code = code;
  }
}

export type ScoreAssessmentInput = {
  major: Major;
  /** Answers keyed by question id → selected option id. */
  answers: Record<string, string>;
  /** The trusted question set from the locked questionnaire version. */
  questionSet: ScoreQuestionSet;
};

function buildExplanationMetadata(params: {
  winner: ScoredConcentration;
  ranked: readonly ScoredConcentration[];
  questions: readonly ScoreQuestion[];
  resolvedAnswers: readonly ValidatedAnswer[];
  tieBreakStage: ExplanationMetadata["tieBreakStage"];
  tieBreakNote: string;
}): ExplanationMetadata {
  const { winner, ranked, questions, resolvedAnswers } = params;

  const second = ranked[1] ?? null;
  const gap = second
    ? roundScore(winner.normalizedScore - second.normalizedScore)
    : null;

  const answersByQuestion = new Map(
    resolvedAnswers.map((answer) => [answer.questionId, answer]),
  );

  // Strongest categories for the recommended concentration.
  const categoryTotals: Record<string, number> = {};
  for (const question of questions) {
    if (!question.category) {
      continue;
    }
    const answer = answersByQuestion.get(question.id);
    const weight = answer ? (answer.weights[winner.concentration] ?? 0) : 0;
    categoryTotals[question.category] =
      (categoryTotals[question.category] ?? 0) + weight;
  }
  const strongestCategories = Object.entries(categoryTotals)
    .filter(([, total]) => total > 0)
    .sort(
      ([categoryA, totalA], [categoryB, totalB]) =>
        totalB - totalA || categoryA.localeCompare(categoryB),
    )
    .slice(0, 3)
    .map(([category]) => category);

  // Strongest contributing answers for the recommended concentration.
  const strongestAnswers = resolvedAnswers
    .map((answer) => ({
      questionId: answer.questionId,
      answerKey: answer.answerKey,
      weight: answer.weights[winner.concentration] ?? 0,
    }))
    .filter((answer) => answer.weight > 0)
    .sort(
      (a, b) => b.weight - a.weight || a.questionId.localeCompare(b.questionId),
    )
    .slice(0, 3)
    .map(({ questionId, answerKey }) => ({ questionId, answerKey }));

  return {
    topConcentration: winner.concentration,
    secondConcentration: second?.concentration ?? null,
    gap,
    strongestCategories,
    strongestAnswers,
    tieBreakStage: params.tieBreakStage,
    tieBreakNote: params.tieBreakNote,
  };
}

/**
 * Scores a completed assessment from a trusted question set.
 *
 * Strict validation rules:
 *  - Every question in the question set must have exactly one answer.
 *  - Unknown / cross-version question IDs are rejected (never silently scored).
 *  - The answer key must resolve to a real option of that question.
 */
export function scoreAssessment(input: ScoreAssessmentInput): AssessmentScoreResult {
  const { major, answers, questionSet } = input;
  const { questions, concentrations } = questionSet;

  if (questions.length === 0) {
    throw new AssessmentSubmissionError(
      "questionnaire-misconfigured",
      "The questionnaire could not be loaded. Please try again later.",
    );
  }

  // Every submitted answer must reference a question in this questionnaire
  // version (rejects invented/cross-version/cross-major question ids).
  const knownQuestionIds = new Set(questions.map((question) => question.id));
  for (const questionId of Object.keys(answers)) {
    if (!knownQuestionIds.has(questionId)) {
      throw new AssessmentSubmissionError(
        "invalid-answer",
        `Question "${questionId}" is not part of this questionnaire. Please review your answers and try again.`,
      );
    }
  }

  const answeredQuestionIds = new Set(Object.keys(answers));
  if (answeredQuestionIds.size !== questions.length) {
    throw new AssessmentSubmissionError(
      "incomplete",
      `The assessment is incomplete. Please answer all ${questions.length} questions before submitting.`,
    );
  }

  const seen = new Set<string>();
  for (const question of questions) {
    if (seen.has(question.id)) {
      throw new AssessmentSubmissionError(
        "questionnaire-misconfigured",
        "The questionnaire is not configured correctly. Please try again later.",
      );
    }
    seen.add(question.id);
  }

  // Resolve and validate every answer against the trusted question set.
  const resolvedAnswers: ValidatedAnswer[] = [];
  for (const question of questions) {
    const answerKey = answers[question.id];
    if (!answerKey) {
      throw new AssessmentSubmissionError(
        "incomplete",
        `The assessment is incomplete. Please answer all ${questions.length} questions before submitting.`,
      );
    }
    const option = question.options.find((candidate) => candidate.id === answerKey);
    if (!option) {
      throw new AssessmentSubmissionError(
        "invalid-answer",
        `Answer "${answerKey}" is not a valid option for question ${question.id}. Please review your answers and try again.`,
      );
    }
    resolvedAnswers.push({
      questionId: question.id,
      answerKey: option.id,
      numericValue: option.numericValue,
      weights: option.weights,
    });
  }

  // Accumulate trusted weights into raw scores (initialize every valid
  // concentration at zero before processing answers).
  const rawScores: Record<Concentration, number> = {} as Record<Concentration, number>;
  const rawByQuestion: Record<Concentration, Record<string, number>> =
    {} as Record<Concentration, Record<string, number>>;
  for (const concentration of concentrations) {
    rawScores[concentration] = 0;
    rawByQuestion[concentration] = {};
  }
  for (const answer of resolvedAnswers) {
    for (const concentration of concentrations) {
      const weight = answer.weights[concentration] ?? 0;
      rawScores[concentration] += weight;
      rawByQuestion[concentration][answer.questionId] = weight;
    }
  }

  // Theoretical maximum raw score per concentration, derived from the trusted
  // question set (max option weight per question, summed).
  const maxScores: Record<string, number> = getMaxScoresForConcentrations(
    questions,
    concentrations,
  );

  // Score + normalize every concentration independently.
  const scored: ScoredConcentration[] = concentrations.map((concentration) => {
    const maxScore = maxScores[concentration] ?? 0;
    return {
      concentration,
      rawScore: rawScores[concentration],
      maxScore,
      normalizedScore: normalizeScore(rawScores[concentration], maxScore),
    };
  });

  // Rank explicitly and deterministically (never rely on object iteration).
  const ranked = [...scored].sort((a, b) => {
    if (a.normalizedScore !== b.normalizedScore) {
      return b.normalizedScore - a.normalizedScore;
    }
    if (a.rawScore !== b.rawScore) {
      return b.rawScore - a.rawScore;
    }
    return 0;
  });

  // Deterministic tie handling (documented in lib/scoring/tie-break.ts):
  //   1. highest normalized score,
  //   2. number of strong responses (weight >= 4) for the concentration,
  //   3. fixed major-specific concentration fallback order.
  const tieBreakContext: TieBreakContext = {
    major,
    weightsByQuestion: rawByQuestion,
  };
  const { winner, stage, note } = resolveTieBreak(ranked, tieBreakContext);

  // Confidence from the top-two gap.
  const second = ranked[1] ?? null;
  const gap = second
    ? roundScore(winner.normalizedScore - second.normalizedScore)
    : null;
  const confidenceLabel = getConfidenceLabel(gap);

  const explanation = buildExplanationMetadata({
    winner,
    ranked,
    questions,
    resolvedAnswers,
    tieBreakStage: stage,
    tieBreakNote: note,
  });

  return {
    major,
    scores: ranked,
    answers: resolvedAnswers,
    recommendedConcentration: winner.concentration,
    recommendedScore: winner.normalizedScore,
    confidenceLabel,
    explanation,
  };
}

