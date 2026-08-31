import type { ConfidenceLabel } from "@/lib/scoring/types";

/**
 * Deterministic confidence labels based on the gap between the top two
 * normalized scores (both rounded to one decimal place).
 *
 * Documented thresholds:
 *
 *   High         gap >= 15   (a clear winner)
 *   Moderate     gap >= 7    and gap < 15  (a leaning winner)
 *   Close Match  gap < 7     (the top two are very close)
 *
 * This is a questionnaire-based fit heuristic, NOT scientific certainty.
 */

export const CONFIDENCE_HIGH_GAP = 15;
export const CONFIDENCE_MODERATE_GAP = 7;

/**
 * Returns the confidence label for a top-two gap.
 *
 * `gap` is null only in the defensive single-concentration edge case (no
 * second concentration to compare against), in which case the recommendation
 * is unambiguous within the available set and "High" is returned.
 */
export function getConfidenceLabel(gap: number | null): ConfidenceLabel {
  if (gap === null) {
    return "High";
  }
  if (gap >= CONFIDENCE_HIGH_GAP) {
    return "High";
  }
  if (gap >= CONFIDENCE_MODERATE_GAP) {
    return "Moderate";
  }
  return "Close Match";
}
