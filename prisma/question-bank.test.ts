import { describe, expect, it } from "vitest";

import { CONCENTRATIONS_BY_MAJOR, type Concentration } from "@/data/concentrations";
import { INITIAL_QUESTIONNAIRES, type SeedQuestion } from "./question-bank";
import { MAX_WEIGHT, MIN_WEIGHT } from "../lib/questionnaires/validation";

/**
 * Guards the freshman-friendly initial question bank (requirements 74–78, 92):
 *  - exactly 20 questions per major;
 *  - every weight is an integer in 0–5;
 *  - every concentration has scoring opportunities (theoretical max > 0);
 *  - a reasonable question-type mix;
 *  - no unexplained technical terminology a freshman would not know.
 */

/** Terms that must never appear in the initial question wording. */
const FORBIDDEN_TERMS: readonly RegExp[] = [
  /penetration test/i,
  /kubernetes/i,
  /\bcnn\b/i,
  /\bci\/cd\b/i,
  /\berp\b/i,
  /\bdevops\b/i,
  /\biot\b/i,
  /\bai model/i,
  /machine learning/i,
  /neural network/i,
  /medical imaging/i,
  /sensor protocol/i,
  /\bdocker\b/i,
  /\bpipeline\b/i,
  /\bvulnerabilit/i,
  /\bapi\b/i,
  /\bdatabase\b/i,
  /\balgorithm\b/i,
  /\bregression\b/i,
  /\bclassification\b/i,
  /\bstatistical\b/i,
  /\benterprise resource planning/i,
  /\bcyber security\b/i,
  /\bgame development\b/i,
  /\bdata science\b/i,
  /\bartificial intelligence\b/i,
  /\binternet of things\b/i,
];

function weightsOf(question: SeedQuestion): Array<[Concentration, number]> {
  const result: Array<[Concentration, number]> = [];
  for (const option of question.options) {
    for (const [concentration, weight] of Object.entries(option.weights)) {
      result.push([concentration as Concentration, weight as number]);
    }
  }
  return result;
}

describe("initial question bank", () => {
  it("contains exactly 20 questions per major (40 total)", () => {
    expect(INITIAL_QUESTIONNAIRES).toHaveLength(2);
    for (const questionnaire of INITIAL_QUESTIONNAIRES) {
      expect(questionnaire.questions).toHaveLength(20);
    }
  });

  it("keeps every weight an integer within 0–5", () => {
    for (const questionnaire of INITIAL_QUESTIONNAIRES) {
      for (const question of questionnaire.questions) {
        for (const [concentration, weight] of weightsOf(question)) {
          expect(
            Number.isInteger(weight),
            `${question.text} has a non-integer weight`,
          ).toBe(true);
          expect(weight).toBeGreaterThanOrEqual(MIN_WEIGHT);
          expect(weight).toBeLessThanOrEqual(MAX_WEIGHT);
          expect(
            CONCENTRATIONS_BY_MAJOR[questionnaire.major].includes(concentration),
            `${question.text} weights the cross-major concentration ${concentration}`,
          ).toBe(true);
        }
      }
    }
  });

  it("gives every concentration scoring opportunities (theoretical max > 0)", () => {
    for (const questionnaire of INITIAL_QUESTIONNAIRES) {
      const concentrations = CONCENTRATIONS_BY_MAJOR[questionnaire.major];
      const maxByConcentration: Partial<Record<Concentration, number>> = {};
      for (const concentration of concentrations) {
        maxByConcentration[concentration] = 0;
      }
      for (const question of questionnaire.questions) {
        for (const concentration of concentrations) {
          let best = 0;
          for (const option of question.options) {
            const weight = option.weights[concentration] ?? 0;
            if (weight > best) {
              best = weight;
            }
          }
          maxByConcentration[concentration] =
            (maxByConcentration[concentration] ?? 0) + best;
        }
      }
      for (const concentration of concentrations) {
        expect(
          maxByConcentration[concentration],
          `${questionnaire.major}: ${concentration} has no scoring opportunities`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("uses a reasonable mix of question types in each questionnaire", () => {
    for (const questionnaire of INITIAL_QUESTIONNAIRES) {
      const types = new Set(questionnaire.questions.map((question) => question.type));
      for (const expected of [
        "LIKERT",
        "AGREEMENT",
        "MULTIPLE_CHOICE",
        "SCENARIO",
        "PRIORITY",
      ]) {
        expect(
          types.has(expected as SeedQuestion["type"]),
          `${questionnaire.major} has no ${expected} questions`,
        ).toBe(true);
      }
    }
  });

  it("has no duplicate question texts within a questionnaire", () => {
    for (const questionnaire of INITIAL_QUESTIONNAIRES) {
      const texts = questionnaire.questions.map((question) => question.text);
      expect(new Set(texts).size).toBe(texts.length);
    }
  });

  it("avoids technical terminology a freshman may not know", () => {
    for (const questionnaire of INITIAL_QUESTIONNAIRES) {
      for (const question of questionnaire.questions) {
        const haystack = `${question.text} ${question.options.map((o) => o.label).join(" ")}`;
        for (const term of FORBIDDEN_TERMS) {
          expect(
            term.test(haystack),
            `${questionnaire.major} question uses forbidden terminology: "${term}"`,
          ).toBe(false);
        }
      }
    }
  });
});
