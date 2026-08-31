/**
 * Normalization helpers (STEP 7, requirement 13–16).
 *
 * Every concentration is normalized independently:
 *
 *   normalizedScore = (rawScore / maximumPossibleScore) * 100
 *
 * The theoretical maximum is computed from the trusted question
 * configuration (see lib/scoring-utils.ts) — it is never hardcoded and never
 * client-supplied. Scores are rounded to one decimal place and clamped to
 * 0–100 so floating-point edge cases can never leak values such as
 * `100.0000004` or `-0.00001`.
 */

/** Decimal places used for every stored/returned normalized score. */
export const SCORE_DECIMAL_PLACES = 1;

/** Maximum normalized score (0–100 scale). */
export const MAX_NORMALIZED_SCORE = 100;

/**
 * Rounds a value to one decimal place using Math.round, which is
 * deterministic (unlike toFixed, whose rounding can be float-dependent).
 */
export function roundScore(value: number): number {
  const factor = 10 ** SCORE_DECIMAL_PLACES;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Clamps any value into the closed 0–100 range. */
export function clampNormalizedScore(value: number): number {
  return Math.min(MAX_NORMALIZED_SCORE, Math.max(0, value));
}

/**
 * Normalizes a raw score against its concentration's theoretical maximum.
 *
 * - If the maximum is 0 (or negative), returns 0 safely.
 * - Returns a rounded, clamped 0–100 value.
 */
export function normalizeScore(rawScore: number, maxScore: number): number {
  if (!Number.isFinite(rawScore) || !Number.isFinite(maxScore) || maxScore <= 0) {
    return 0;
  }
  const normalized = (rawScore / maxScore) * MAX_NORMALIZED_SCORE;
  return clampNormalizedScore(roundScore(normalized));
}
