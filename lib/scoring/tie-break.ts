import type { Concentration } from "@/data/concentrations";
import type { Major } from "@/lib/major";
import type {
  ScoredConcentration,
  TieBreakStage,
} from "@/lib/scoring/types";

/**
 * Deterministic tie handling (STEP 7, updated for database-managed weights).
 *
 * The recommendation always uses normalized scores. When scores tie, the
 * winner is resolved through an explicit, documented sequence:
 *
 *   1. Highest normalized score (values rounded to 1 decimal place, i.e. the
 *      exact values stored in the database).
 *   2. Number of STRONG responses for that concentration — questions where
 *      the selected answer carried a weight >= 4. This is the database-era
 *      equivalent of the old raw-score stage: it prefers the concentration
 *      that the student indicated strongly on more questions.
 *   3. A documented fixed concentration priority order (below).
 *
 * Math.random(), database row order, and object-key iteration are NEVER used
 * as tie-breakers — identical answers always produce the same winner.
 */

/**
 * Fixed final fallback priority. This is used ONLY after every score-based
 * stage is exhausted; it never biases normal scoring.
 */
export const FIXED_CONCENTRATION_PRIORITY: Record<Major, readonly Concentration[]> = {
  INFORMATICS: [
    "CYBER_SECURITY",
    "IOT",
    "AI",
    "AI_HEALTHCARE",
    "GAME_DEVELOPMENT",
    "DEVOPS",
  ],
  INFORMATION_SYSTEMS: ["DATA_SCIENCE", "ERP", "BPA"],
};

/** A weight at or above this value counts as a "strong" response. */
export const STRONG_RESPONSE_WEIGHT = 4;

/**
 * Stable descending comparison for ranking: normalized score desc, then raw
 * score desc. Equal scores return 0 so the caller's explicit tie-break logic
 * (not JavaScript sort stability across environments) decides the winner.
 */
export function compareScoredDesc(a: ScoredConcentration, b: ScoredConcentration): number {
  if (a.normalizedScore !== b.normalizedScore) {
    return b.normalizedScore - a.normalizedScore;
  }
  if (a.rawScore !== b.rawScore) {
    return b.rawScore - a.rawScore;
  }
  return 0;
}

export type TieBreakContext = {
  major: Major;
  /**
   * Weight each concentration received on each question,
   * keyed by concentration then question id.
   */
  weightsByQuestion: Record<Concentration, Record<string, number>>;
};

export type TieBreakOutcome = {
  winner: ScoredConcentration;
  stage: TieBreakStage;
  note: string;
};

/** Number of questions where the concentration earned a strong weight (>= 4). */
export function countStrongResponses(
  context: TieBreakContext,
  concentration: Concentration,
): number {
  const byQuestion = context.weightsByQuestion[concentration] ?? {};
  return Object.values(byQuestion).filter(
    (weight) => weight >= STRONG_RESPONSE_WEIGHT,
  ).length;
}

/**
 * Resolves the winner from a fully scored set using the documented
 * deterministic tie-break sequence.
 */
export function resolveTieBreak(
  scores: readonly ScoredConcentration[],
  context: TieBreakContext,
): TieBreakOutcome {
  if (scores.length === 0) {
    throw new Error("Cannot resolve a winner without any scored concentrations.");
  }

  // Stage 1 — highest normalized score (already rounded to 1 decimal place,
  // identical to the values persisted in the database).
  const ranked = [...scores].sort(compareScoredDesc);
  const topNormalized = ranked[0].normalizedScore;
  let candidates = ranked.filter(
    (score) => score.normalizedScore === topNormalized,
  );

  if (candidates.length === 1) {
    return {
      winner: candidates[0],
      stage: "normalized-score",
      note: `Highest normalized score (${topNormalized.toFixed(1)}).`,
    };
  }

  // Stage 2 — most strong responses (selected answers with weight >= 4).
  const strongCounts = new Map(
    candidates.map((candidate) => [
      candidate.concentration,
      countStrongResponses(context, candidate.concentration),
    ]),
  );
  const topStrongCount = Math.max(...strongCounts.values());
  candidates = candidates.filter(
    (candidate) => strongCounts.get(candidate.concentration) === topStrongCount,
  );
  if (candidates.length === 1) {
    return {
      winner: candidates[0],
      stage: "strong-responses",
      note: `Normalized scores tied at ${topNormalized.toFixed(
        1,
      )}; the concentration with the most strong responses (weight >= ${STRONG_RESPONSE_WEIGHT}, count ${topStrongCount}) decided it.`,
    };
  }

  // Stage 3 — documented fixed priority order (final deterministic fallback).
  const priority = FIXED_CONCENTRATION_PRIORITY[context.major];
  const winner = priority
    .map((concentration) =>
      candidates.find((candidate) => candidate.concentration === concentration),
    )
    .find(
      (candidate): candidate is ScoredConcentration => candidate !== undefined,
    );

  if (!winner) {
    // Defensive: a concentration outside the documented priority list could
    // only appear if the questionnaire configuration changes. Fall back to
    // the first candidate in questionnaire order (still fully deterministic).
    const defensiveWinner = candidates[0];
    return {
      winner: defensiveWinner,
      stage: "fixed-priority",
      note: `Tied on every score-based stage; fell back to questionnaire order (${defensiveWinner.concentration}).`,
    };
  }

  return {
    winner,
    stage: "fixed-priority",
    note: `Tied on every score-based stage; the fixed priority order chose ${winner.concentration}.`,
  };
}

