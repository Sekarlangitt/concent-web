import { clampNormalizedScore, roundScore } from "@/lib/scoring/normalization";

/**
 * Suitability-score formatting for the result page (STEP 8).
 *
 * Every displayed normalized score uses the exact same deterministic rounding
 * convention established in STEP 7 (roundScore → clampNormalizedScore), then
 * renders with one decimal place:
 *
 *   84    → "84.0%"
 *   84.456 → "84.5%"
 *   100   → "100.0%"
 *   0     → "0.0%"
 *
 * The result page never recomputes scores from client state — it only formats
 * the authoritative normalized scores stored in PostgreSQL. Non-finite values
 * degrade to 0% safely rather than leaking "NaN%" or "Infinity%".
 */
export function formatSuitabilityScore(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${clampNormalizedScore(roundScore(safe)).toFixed(1)}%`;
}
