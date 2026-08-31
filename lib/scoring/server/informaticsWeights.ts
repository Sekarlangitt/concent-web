import "server-only";

import type { Concentration } from "@/data/concentrations";
import {
  informaticsQuestions,
  INFORMATICS_CONCENTRATIONS,
  type InformaticsConcentration,
  type InformaticsQuestion,
} from "@/data/informaticsQuestions";

/**
 * SERVER-ONLY Informatics scoring configuration (STEP 12 security refactor).
 *
 * This module is the dedicated entry point for every server-side module that
 * needs the authoritative Informatics question configuration AND its
 * per-option scoring weights. It imports "server-only", so any attempt to
 * pull it (or the configuration it exposes) into a Client Component fails at
 * build time.
 *
 * Client Components receive only the weight-free public metadata from
 * data/publicQuestions.ts. This file is the counter-part: the authoritative
 * weights, derived from the single source of truth
 * (data/informaticsQuestions.ts) so they can never drift from the questions
 * students actually answer.
 *
 * Exports:
 *   - getInformaticsScoringConfig()      — full questions + concentration set
 *   - getInformaticsOptionWeights(id, optionId) — trusted weights for one answer
 */

export type InformaticsOptionWeights = Partial<
  Record<InformaticsConcentration, number>
>;

/** Question id → option id → trusted weights (derived once at load time). */
export type InformaticsWeightMap = Readonly<
  Record<string, Readonly<Record<string, InformaticsOptionWeights>>>
>;

function buildInformaticsWeightMap(): InformaticsWeightMap {
  const map: Record<string, Record<string, InformaticsOptionWeights>> = {};
  for (const question of informaticsQuestions) {
    const options: Record<string, InformaticsOptionWeights> = {};
    for (const option of question.options) {
      options[option.id] = option.weights;
    }
    map[question.id] = options;
  }
  return map;
}

/** Authoritative Informatics weights, keyed by question id then option id. */
export const INFORMATICS_WEIGHTS_BY_QUESTION: InformaticsWeightMap =
  buildInformaticsWeightMap();

/** Returns the full server-side Informatics question set and concentrations. */
export function getInformaticsScoringConfig(): {
  questions: readonly InformaticsQuestion[];
  concentrations: readonly InformaticsConcentration[];
} {
  return {
    questions: informaticsQuestions,
    concentrations: INFORMATICS_CONCENTRATIONS,
  };
}

/**
 * Returns the trusted weights for one option, or an empty map when the
 * question/option IDs are unknown. Empty weights are safe (weight 0) but an
 * unknown option should already have been rejected during validation.
 */
export function getInformaticsOptionWeights(
  questionId: string,
  optionId: string,
): Partial<Record<Concentration, number>> {
  return INFORMATICS_WEIGHTS_BY_QUESTION[questionId]?.[optionId] ?? {};
}
