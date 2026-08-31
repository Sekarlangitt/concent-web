import "server-only";

import type { Concentration } from "@/data/concentrations";
import {
  informationSystemsQuestions,
  INFORMATION_SYSTEMS_CONCENTRATIONS,
  type InformationSystemsConcentration,
  type InformationSystemsQuestion,
} from "@/data/informationSystemsQuestions";

/**
 * SERVER-ONLY Information Systems scoring configuration (STEP 12 security
 * refactor).
 *
 * This module is the dedicated entry point for every server-side module that
 * needs the authoritative Information Systems question configuration AND its
 * per-option scoring weights. It imports "server-only", so any attempt to
 * pull it (or the configuration it exposes) into a Client Component fails at
 * build time.
 *
 * Client Components receive only the weight-free public metadata from
 * data/publicQuestions.ts. This file is the counter-part: the authoritative
 * weights, derived from the single source of truth
 * (data/informationSystemsQuestions.ts) so they can never drift from the
 * questions students actually answer.
 */

export type InformationSystemsOptionWeights = Partial<
  Record<InformationSystemsConcentration, number>
>;

/** Question id → option id → trusted weights (derived once at load time). */
export type InformationSystemsWeightMap = Readonly<
  Record<string, Readonly<Record<string, InformationSystemsOptionWeights>>>
>;

function buildInformationSystemsWeightMap(): InformationSystemsWeightMap {
  const map: Record<string, Record<string, InformationSystemsOptionWeights>> = {};
  for (const question of informationSystemsQuestions) {
    const options: Record<string, InformationSystemsOptionWeights> = {};
    for (const option of question.options) {
      options[option.id] = option.weights;
    }
    map[question.id] = options;
  }
  return map;
}

/** Authoritative Information Systems weights, keyed by question/option id. */
export const INFORMATION_SYSTEMS_WEIGHTS_BY_QUESTION: InformationSystemsWeightMap =
  buildInformationSystemsWeightMap();

/** Returns the full server-side IS question set and concentrations. */
export function getInformationSystemsScoringConfig(): {
  questions: readonly InformationSystemsQuestion[];
  concentrations: readonly InformationSystemsConcentration[];
} {
  return {
    questions: informationSystemsQuestions,
    concentrations: INFORMATION_SYSTEMS_CONCENTRATIONS,
  };
}

/**
 * Returns the trusted weights for one option, or an empty map when the
 * question/option IDs are unknown. Empty weights are safe (weight 0) but an
 * unknown option should already have been rejected during validation.
 */
export function getInformationSystemsOptionWeights(
  questionId: string,
  optionId: string,
): Partial<Record<Concentration, number>> {
  return (
    INFORMATION_SYSTEMS_WEIGHTS_BY_QUESTION[questionId]?.[optionId] ?? {}
  );
}
