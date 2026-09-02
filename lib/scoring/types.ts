import type { Concentration } from "@/data/concentrations";
import type { QuestionType } from "@/data/questionTypes";
import type { Major } from "@/lib/major";

/**
 * Shared scoring types (STEP 7, extended for database-managed questionnaires).
 *
 * These types describe the pure server-side scoring pipeline. They are
 * framework-neutral so they can be imported by the route handler, the
 * database layer, and the unit tests without pulling Prisma or React into
 * the mathematical scoring core.
 *
 * Since the questionnaire became database-managed, the pure scorer accepts an
 * explicit `questionSet` (loaded from a QuestionnaireVersion) instead of
 * importing hardcoded question configuration.
 */

/**
 * Confidence label thresholds are implemented in lib/scoring/confidence.ts.
 * The label is a questionnaire-fit heuristic, never scientific certainty.
 */
export type ConfidenceLabel = "High" | "Moderate" | "Close Match";

/**
 * Which deterministic tie-break stage selected the winner. Used by tests and
 * by the explanation layer to document why a recommendation won.
 */
export type TieBreakStage =
  | "normalized-score"
  | "strong-responses"
  | "fixed-priority";

/** One concentration's trusted, normalized result for a completed assessment. */
export type ScoredConcentration = {
  concentration: Concentration;
  rawScore: number;
  maxScore: number;
  normalizedScore: number;
};

/** One option as the pure scorer sees it (weights resolved from the database). */
export type ScoreQuestionOption = {
  id: string;
  label: string;
  /** Ordinal for LIKERT/AGREEMENT/PRIORITY (1–5), otherwise null. */
  numericValue: number | null;
  weights: Partial<Record<Concentration, number>>;
};

/** One question as the pure scorer sees it. */
export type ScoreQuestion = {
  id: string;
  type: QuestionType;
  text: string;
  category?: string;
  options: readonly ScoreQuestionOption[];
};

/** The full, trusted scoring input for one questionnaire version. */
export type ScoreQuestionSet = {
  questions: readonly ScoreQuestion[];
  /** The concentrations that belong to the questionnaire's major. */
  concentrations: readonly Concentration[];
};

/**
 * One answer resolved against the trusted question configuration. The
 * `weights` object is server-derived only — the client never submits scores.
 */
export type ValidatedAnswer = {
  questionId: string;
  answerKey: string;
  /** Ordinal value for LIKERT/AGREEMENT/PRIORITY (1–5), otherwise null. */
  numericValue: number | null;
  weights: Partial<Record<Concentration, number>>;
};

/**
 * Explanation helpers: data that lets a future result page explain the
 * recommendation deterministically without storing verbose text.
 */
export type ExplanationMetadata = {
  topConcentration: Concentration;
  secondConcentration: Concentration | null;
  /** Rounded top-minus-second gap used for the confidence label. */
  gap: number | null;
  strongestCategories: string[];
  strongestAnswers: Array<{ questionId: string; answerKey: string }>;
  tieBreakStage: TieBreakStage;
  tieBreakNote: string;
};

/** The complete result of the pure scoring function. */
export type AssessmentScoreResult = {
  major: Major;
  /** All concentrations ranked (normalized desc, then tie logic). */
  scores: ScoredConcentration[];
  /** The 20 validated answers (used for persistence). */
  answers: ValidatedAnswer[];
  recommendedConcentration: Concentration;
  /** The recommended concentration's normalized score (0–100, 1 decimal). */
  recommendedScore: number;
  confidenceLabel: ConfidenceLabel;
  explanation: ExplanationMetadata;
};

