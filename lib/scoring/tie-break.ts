import type { Concentration } from "@/data/concentrations";
import type { Major } from "@/lib/major";
import type {
  ScoredConcentration,
  TieBreakStage,
} from "@/lib/scoring/types";

/**
 * Deterministic tie handling (STEP 7, requirements 17–20).
 *
 * The recommendation always uses normalized scores. When scores tie, the
 * winner is resolved through an explicit, documented sequence:
 *
 *   1. Highest normalized score (values rounded to 1 decimal place, i.e. the
 *      exact values stored in the database).
 *   2. Highest raw score.
 *   3. High-value differentiator ("tie-breaker") questions from STEP 4/5
 *      metadata (`tieBreakerPriority`, 1 = strongest), evaluated in priority
 *      order, then questionnaire order.
 *   4. A documented fixed concentration priority order (below).
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
  INFORMATION_SYSTEMS: ["DATA_SCIENCE", "ERP"],
};

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

/** One high-value differentiator question used at tie-break stage 3. */
export type TieBreakerQuestion = {
  id: string;
  /** Lower number = stronger differentiator (1 is the strongest). */
  priority: number;
  /** 0-based position in the questionnaire, for stable ordering. */
  order: number;
};

export type TieBreakContext = {
  major: Major;
  /**
   * Weight each concentration received on each question,
   * keyed by concentration then question id.
   */
  weightsByQuestion: Record<Concentration, Record<string, number>>;
  tieBreakerQuestions: readonly TieBreakerQuestion[];
};

export type TieBreakOutcome = {
  winner: ScoredConcentration;
  stage: TieBreakStage;
  note: string;
};

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

  // Stage 2 — highest raw score among the normalized tie.
  const topRaw = Math.max(...candidates.map((candidate) => candidate.rawScore));
  candidates = candidates.filter((candidate) => candidate.rawScore === topRaw);
  if (candidates.length === 1) {
    return {
      winner: candidates[0],
      stage: "raw-score",
      note: `Normalized scores tied at ${topNormalized.toFixed(
        1,
      )}; the highest raw score (${topRaw}) decided it.`,
    };
  }

  // Stage 3 — high-value tie-breaker questions, priority order then
  // questionnaire order. A question only narrows the field when the tied
  // concentrations differ on it.
  const orderedTieBreakers = [...context.tieBreakerQuestions].sort(
    (a, b) => a.priority - b.priority || a.order - b.order,
  );
  for (const question of orderedTieBreakers) {
    const weightFor = (candidate: ScoredConcentration) =>
      context.weightsByQuestion[candidate.concentration]?.[question.id] ?? 0;
    const maxWeight = Math.max(...candidates.map(weightFor));
    const remaining = candidates.filter(
      (candidate) => weightFor(candidate) === maxWeight,
    );
    if (remaining.length === 1) {
      return {
        winner: remaining[0],
        stage: "tie-breaker-question",
        note: `Tied on normalized and raw scores; tie-breaker question ${question.id} (priority ${question.priority}) decided it with weight ${maxWeight}.`,
      };
    }
    candidates = remaining;
  }

  // Stage 4 — documented fixed priority order (final deterministic fallback).
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
    // only appear if the question configuration changes. Fall back to the
    // first candidate in questionnaire order (still fully deterministic).
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
