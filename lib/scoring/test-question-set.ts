import type { Major } from "@/lib/major";
import type { ScoreQuestionSet } from "@/lib/scoring/types";
import { getInformaticsScoringConfig } from "@/lib/scoring/server/informaticsWeights";
import { getInformationSystemsScoringConfig } from "@/lib/scoring/server/informationSystemsWeights";

/**
 * Test-only helper: builds a ScoreQuestionSet from the LEGACY TypeScript
 * question configuration.
 *
 * The production runtime loads question sets from PostgreSQL (see
 * lib/questionnaires/scoring.ts). This helper exists so the pure scoring and
 * explanation tests can drive the scorer with the historical question bank
 * that seeded the database, without needing a live database connection.
 */

const NUMERIC_TYPES = new Set(["LIKERT", "AGREEMENT", "PRIORITY"]);

export function getLegacyQuestionSet(major: Major): ScoreQuestionSet {
  const config =
    major === "INFORMATICS"
      ? getInformaticsScoringConfig()
      : getInformationSystemsScoringConfig();

  return {
    concentrations: [...config.concentrations],
    questions: config.questions.map((question) => ({
      id: question.id,
      type: question.type,
      text: question.text,
      category: question.category,
      options: question.options.map((option, index) => ({
        id: option.id,
        label: option.label,
        numericValue: NUMERIC_TYPES.has(question.type) ? index + 1 : null,
        weights: { ...option.weights },
      })),
    })),
  };
}
