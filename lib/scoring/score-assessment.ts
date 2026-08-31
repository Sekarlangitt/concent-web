import "server-only";

import type { Concentration } from "@/data/concentrations";
import type { QuestionType } from "@/data/questionTypes";
import type { Major } from "@/lib/major";
import { QUESTIONS_PER_MAJOR } from "@/lib/major";
import { getMaxScoresForConcentrations } from "@/lib/scoring-utils";
import { getConfidenceLabel } from "@/lib/scoring/confidence";
import { normalizeScore, roundScore } from "@/lib/scoring/normalization";
import { getInformaticsScoringConfig } from "@/lib/scoring/server/informaticsWeights";
import { getInformationSystemsScoringConfig } from "@/lib/scoring/server/informationSystemsWeights";
import {
  resolveTieBreak,
  type TieBreakContext,
  type TieBreakerQuestion,
} from "@/lib/scoring/tie-break";
import type {
  AssessmentScoreResult,
  ExplanationMetadata,
  ScoredConcentration,
  ValidatedAnswer,
} from "@/lib/scoring/types";

/**
 * Pure, server-safe assessment scoring (STEP 7).
 *
 * `scoreAssessment` is the authoritative scoring pipeline:
 *
 *   1. Resolve the student's major to the trusted 20-question set.
 *   2. Strictly validate every submitted answer against the configuration
 *      (no client-supplied scores/weights are ever accepted).
 *   3. Accumulate trusted option weights into per-concentration raw scores.
 *   4. Compute theoretical maximum scores from the question configuration.
 *   5. Normalize each concentration independently to 0–100.
 *   6. Rank deterministically (normalized desc, raw desc, then tie logic).
 *   7. Determine the recommendation, its score, and a deterministic
 *      confidence label.
 *
 * No Prisma calls live here — persistence is orchestrated by the route
 * handler inside a single transaction.
 */

/** Error thrown for any malformed/missing answer set. `message` is student-safe. */
export class AssessmentSubmissionError extends Error {
  readonly code:
    | "unknown-major"
    | "questionnaire-misconfigured"
    | "unknown-question"
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
  /** Answers keyed by stable question id → stable option id. */
  answers: Record<string, string>;
};

/** The question types whose options carry a meaningful 1–5 ordinal value. */
const NUMERIC_QUESTION_TYPES: ReadonlySet<QuestionType> = new Set([
  "LIKERT",
  "AGREEMENT",
  "PRIORITY",
]);

type QuestionSetConfig = {
  questions: ReadonlyArray<{
    id: string;
    major: string;
    type: QuestionType;
    text: string;
    category?: string;
    tieBreakerPriority?: number;
    options: ReadonlyArray<{
      id: string;
      label: string;
      weights: Partial<Record<Concentration, number>>;
    }>;
  }>;
  concentrations: readonly Concentration[];
};

/**
 * Central concentration-to-major enforcement (requirement 45): the valid
 * concentration set is decided here, never by the database enum alone.
 */
function getQuestionSet(major: Major): QuestionSetConfig {
  if (major === "INFORMATICS") {
    const { questions, concentrations } = getInformaticsScoringConfig();
    return { questions, concentrations };
  }
  if (major === "INFORMATION_SYSTEMS") {
    const { questions, concentrations } = getInformationSystemsScoringConfig();
    return { questions, concentrations };
  }
  throw new AssessmentSubmissionError(
    "unknown-major",
    "Unsupported major. Please start the assessment again.",
  );
}

/**
 * Ordinal value for scaled question types (LIKERT/AGREEMENT/PRIORITY), based
 * on the option's position in the configured scale (1-based). Returns null
 * for scenario/multiple-choice questions, where position carries no ordinal
 * meaning and must never be inferred.
 */
function getNumericValue(
  questionType: QuestionType,
  optionIndex: number,
): number | null {
  return NUMERIC_QUESTION_TYPES.has(questionType) ? optionIndex + 1 : null;
}

function buildExplanationMetadata(params: {
  winner: ScoredConcentration;
  ranked: readonly ScoredConcentration[];
  questions: QuestionSetConfig["questions"];
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
 * Scores a completed assessment from trusted configuration.
 *
 * Strict validation rules:
 *  - Every required question ID must be present with exactly one answer.
 *  - Unknown / cross-major question IDs are rejected (never silently scored).
 *  - The answer key must resolve to a real option of that question.
 */
export function scoreAssessment(input: ScoreAssessmentInput): AssessmentScoreResult {
  const { major, answers } = input;
  const { questions, concentrations } = getQuestionSet(major);

  if (questions.length !== QUESTIONS_PER_MAJOR) {
    throw new AssessmentSubmissionError(
      "questionnaire-misconfigured",
      "The questionnaire is not configured correctly. Please try again later.",
    );
  }

  // Reject unknown or cross-major question IDs (strict validation).
  const requiredQuestionIds = new Set(questions.map((question) => question.id));
  for (const questionId of Object.keys(answers)) {
    if (!requiredQuestionIds.has(questionId)) {
      throw new AssessmentSubmissionError(
        "unknown-question",
        `The assessment contains an unexpected question (${questionId}). Please review your answers and try again.`,
      );
    }
  }

  // Resolve every answer against the trusted configuration.
  const resolvedAnswers: ValidatedAnswer[] = [];
  for (const question of questions) {
    const answerKey = answers[question.id];
    if (!answerKey) {
      throw new AssessmentSubmissionError(
        "incomplete",
        "The assessment is incomplete. Please answer all 20 questions.",
      );
    }
    const optionIndex = question.options.findIndex(
      (option) => option.id === answerKey,
    );
    if (optionIndex === -1) {
      throw new AssessmentSubmissionError(
        "invalid-answer",
        `Answer "${answerKey}" is not a valid option for question ${question.id}. Please review your answers and try again.`,
      );
    }
    const option = question.options[optionIndex];
    resolvedAnswers.push({
      questionId: question.id,
      answerKey: option.id,
      numericValue: getNumericValue(question.type, optionIndex),
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

  // Theoretical maximum raw score per concentration, derived from the
  // question configuration (max option weight per question, summed).
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

  // Deterministic tie handling.
  const tieBreakerQuestions: TieBreakerQuestion[] = questions
    .map((question, order) => ({
      id: question.id,
      priority: question.tieBreakerPriority,
      order,
    }))
    .filter(
      (question): question is TieBreakerQuestion =>
        question.priority !== undefined,
    )
    .sort((a, b) => a.priority - b.priority || a.order - b.order);

  const tieBreakContext: TieBreakContext = {
    major,
    weightsByQuestion: rawByQuestion,
    tieBreakerQuestions,
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

