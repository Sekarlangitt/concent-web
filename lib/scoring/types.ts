import type { Concentration } from "@/data/concentrations";
import type { Major } from "@/lib/major";

/**
 * Shared scoring types (STEP 7).
 *
 * These types describe the pure server-side scoring pipeline. They are
 * framework-neutral so they can be imported by the route handler, the
 * database layer, and the unit tests without pulling Prisma or React into
 * the mathematical scoring core.
 */

/**
 * Confidence label thresholds are implemented in lib/scoring/confidence.ts.
 * The label is a questionnaire-fit heuristic, never scientific certainty.
 */
export type ConfidenceLabel = "High" | "Moderate" | "Close Match";

/**
 * Which deterministic tie-break stage selected the winner. Used by tests and
 * by the (future) explanation layer to document why a recommendation won.
 */
export type TieBreakStage =
  | "normalized-score"
  | "raw-score"
  | "tie-breaker-question"
  | "fixed-priority";

/** One concentration's trusted, normalized result for a completed assessment. */
export type ScoredConcentration = {
  concentration: Concentration;
  rawScore: number;
  maxScore: number;
  normalizedScore: number;
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
 * Explanation helpers (requirement 24): data that lets a future result page
 * explain the recommendation deterministically without storing verbose text.
 * Not persisted in STEP 7.
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
  /** All concentrations ranked (normalized desc, raw desc, then tie logic). */
  scores: ScoredConcentration[];
  /** The 20 validated answers (used for persistence). */
  answers: ValidatedAnswer[];
  recommendedConcentration: Concentration;
  /** The recommended concentration's normalized score (0–100, 1 decimal). */
  recommendedScore: number;
  confidenceLabel: ConfidenceLabel;
  explanation: ExplanationMetadata;
};
