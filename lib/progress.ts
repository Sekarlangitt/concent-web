/**
 * Progress calculation for the one-question-at-a-time questionnaire.
 *
 * Shared by the assessment UI and its tests so the displayed percentage can
 * never drift from the canonical formula:
 *
 *   ((currentQuestionIndex + 1) / totalQuestions) * 100
 *
 * Examples for a 20-question assessment:
 *   Question 1  →  5%
 *   Question 5  → 25%
 *   Question 10 → 50%
 *   Question 15 → 75%
 *   Question 20 → 100%
 *
 * Invalid indexes are clamped safely to the valid range (0 … total - 1).
 */
export function getProgressPercent(
  currentQuestionIndex: number,
  totalQuestions: number,
): number {
  if (totalQuestions <= 0) {
    return 0;
  }
  const index = Math.min(
    Math.max(currentQuestionIndex, 0),
    totalQuestions - 1,
  );
  return Math.round(((index + 1) / totalQuestions) * 100);
}
