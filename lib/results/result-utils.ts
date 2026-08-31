import {
  CONCENTRATIONS_BY_MAJOR,
  getConcentrationLabel,
  type Concentration,
} from "@/data/concentrations";
import type { Major } from "@/lib/major";
import { roundScore } from "@/lib/scoring/normalization";
import type { ConfidenceLabel } from "@/lib/scoring/types";

/**
 * Result-page assembly helpers (STEP 8).
 *
 * These helpers transform the stored assessment rows into the shape the result
 * page renders. Everything here is deterministic and framework-neutral so it
 * can be unit-tested without Prisma or React:
 *
 *  - `validateStoredResult` enforces enumeration safety (a recommended
 *    concentration must belong to the major) and verifies the expected
 *    number of concentration score rows exists (6 for Informatics, 2 for
 *    Information Systems) so missing/corrupt data can never render a
 *    misleading result.
 *  - `sortScoresDesc` applies an explicit, deterministic ordering
 *    (normalized score desc, raw score desc, then display label) instead of
 *    relying on database insertion order.
 *
 * Display labels intentionally reuse `getConcentrationLabel` from
 * `@/data/concentrations` — the mapping is never duplicated here.
 */

/** One stored ConcentrationScore row, reduced to what the result page needs. */
export type ResultScore = {
  concentration: Concentration;
  normalizedScore: number;
  rawScore: number;
};

/** Validated, sorted result data ready for rendering. */
export type ValidatedResult = {
  major: Major;
  recommendedConcentration: Concentration;
  /** Stored recommendedScore from the Assessment record (authoritative). */
  recommendedScore: number;
  /** Scores filtered to the major's valid set, sorted descending. */
  scores: ResultScore[];
  secondConcentration: Concentration | null;
  /** Rounded top-minus-second normalized gap (1 decimal), or null. */
  gap: number | null;
  expectedScoreCount: number;
};

/** Number of concentration score rows a valid result must contain. */
export function getExpectedScoreCount(major: Major): number {
  return CONCENTRATIONS_BY_MAJOR[major].length;
}

/**
 * Deterministic descending order: normalized score desc, then raw score desc,
 * then display label asc (so equal values never depend on row insertion order).
 */
export function sortScoresDesc(scores: readonly ResultScore[]): ResultScore[] {
  return [...scores].sort((a, b) => {
    if (a.normalizedScore !== b.normalizedScore) {
      return b.normalizedScore - a.normalizedScore;
    }
    if (a.rawScore !== b.rawScore) {
      return b.rawScore - a.rawScore;
    }
    return getConcentrationLabel(a.concentration).localeCompare(
      getConcentrationLabel(b.concentration),
    );
  });
}

/**
 * Drops any score row whose concentration does not belong to the student's
 * major. This is the enumeration-safety filter: a stray cross-major row in the
 * database is ignored instead of crashing or leaking into the display.
 */
export function filterScoresForMajor(
  scores: readonly ResultScore[],
  major: Major,
): ResultScore[] {
  const validConcentrations = new Set<Concentration>(CONCENTRATIONS_BY_MAJOR[major]);
  return scores.filter((score) => validConcentrations.has(score.concentration));
}

/**
 * Validates a stored assessment before rendering.
 *
 * Returns null when the stored data cannot support a truthful result:
 *  - the recommended concentration does not belong to the major, or
 *  - the number of valid score rows differs from the expected count
 *    (missing rows would otherwise render a misleading comparison).
 *
 * Extra cross-major rows are silently dropped by filterScoresForMajor first,
 * so a 7th stray row never invalidates a complete 6-row Informatics result.
 */
export function validateStoredResult(input: {
  major: Major;
  recommendedConcentration: Concentration;
  recommendedScore: number;
  scores: readonly ResultScore[];
}): ValidatedResult | null {
  const { major, recommendedConcentration, recommendedScore } = input;
  const expectedScoreCount = getExpectedScoreCount(major);
  const validConcentrations = new Set<Concentration>(CONCENTRATIONS_BY_MAJOR[major]);

  if (!validConcentrations.has(recommendedConcentration)) {
    return null;
  }

  const filtered = filterScoresForMajor(input.scores, major);
  if (filtered.length !== expectedScoreCount) {
    return null;
  }

  const scores = sortScoresDesc(filtered);
  const winner = scores[0];
  const second = scores[1] ?? null;
  const gap =
    winner && second
      ? roundScore(winner.normalizedScore - second.normalizedScore)
      : null;

  return {
    major,
    recommendedConcentration,
    recommendedScore,
    scores,
    secondConcentration: second?.concentration ?? null,
    gap,
    expectedScoreCount,
  };
}

/**
 * Short explanation shown next to the stored confidence label. This is the
 * same questionnaire-fit vocabulary defined in STEP 7 — a heuristic about how
 * far ahead the top concentration is, never scientific certainty.
 */
export const CONFIDENCE_EXPLANATIONS: Record<ConfidenceLabel, string> = {
  High: "Your top concentration scored noticeably above the next closest option.",
  Moderate:
    "Your top concentration has a meaningful lead, but another area also matched well.",
  "Close Match": "Your top two concentrations scored similarly.",
};

const VALID_CONFIDENCE_LABELS: readonly ConfidenceLabel[] = [
  "High",
  "Moderate",
  "Close Match",
];

/**
 * Resolves a stored confidence label to its display copy, or null when the
 * stored value is missing/unexpected (the label is then simply not shown).
 */
export function getConfidenceExplanation(
  label: string | null,
): { label: ConfidenceLabel; explanation: string } | null {
  if (!label || !VALID_CONFIDENCE_LABELS.includes(label as ConfidenceLabel)) {
    return null;
  }
  const confidenceLabel = label as ConfidenceLabel;
  return {
    label: confidenceLabel,
    explanation: CONFIDENCE_EXPLANATIONS[confidenceLabel],
  };
}
