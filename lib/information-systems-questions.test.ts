import { describe, expect, it } from "vitest";
import {
  informationSystemsQuestions,
  INFORMATION_SYSTEMS_CONCENTRATIONS,
  type InformationSystemsQuestion,
} from "@/data/informationSystemsQuestions";
import {
  assertInformationSystemsQuestionsValid,
  getInformationSystemsCoverage,
  getInformationSystemsMaxScores,
  getQuestionTypeCounts,
  validateInformationSystemsQuestions,
} from "@/lib/scoring-utils";

describe("Information Systems questionnaire configuration", () => {
  it("contains exactly 20 questions", () => {
    expect(informationSystemsQuestions.length).toBe(20);
  });

  it("passes full configuration validation (IDs, weights, types, coverage, balance)", () => {
    expect(() => assertInformationSystemsQuestionsValid()).not.toThrow();
  });

  it("returns no validation errors", () => {
    expect(validateInformationSystemsQuestions()).toEqual([]);
  });

  it("uses the recommended question type distribution", () => {
    const counts = getQuestionTypeCounts(informationSystemsQuestions);
    expect(counts.LIKERT).toBe(5);
    expect(counts.AGREEMENT).toBe(4);
    expect(counts.MULTIPLE_CHOICE).toBe(6);
    expect(counts.SCENARIO).toBe(3);
    expect(counts.PRIORITY).toBe(2);
  });

  it("uses unique question IDs following IS_Q01…IS_Q20", () => {
    const ids = informationSystemsQuestions.map((q) => q.id);
    expect(new Set(ids).size).toBe(20);
    expect(ids).toEqual(
      Array.from({ length: 20 }, (_, i) => `IS_Q${String(i + 1).padStart(2, "0")}`),
    );
  });

  it("uses unique option IDs within each question", () => {
    for (const question of informationSystemsQuestions) {
      const optionIds = question.options.map((o) => o.id);
      expect(new Set(optionIds).size).toBe(optionIds.length);
      for (const optionId of optionIds) {
        expect(optionId).toMatch(new RegExp(`^${question.id}_[A-Z]$`));
      }
    }
  });

  it("gives every question at least 2 answer options", () => {
    for (const question of informationSystemsQuestions) {
      expect(
        question.options.length,
        `expected ${question.id} to have at least 2 options`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps every weight between 0 and 5", () => {
    for (const question of informationSystemsQuestions) {
      for (const option of question.options) {
        for (const weight of Object.values(option.weights)) {
          expect(
            Number.isInteger(weight) && weight >= 0 && weight <= 5,
            `invalid weight ${weight} in ${question.id} / ${option.id}`,
          ).toBe(true);
        }
      }
    }
  });

  it("only uses DATA_SCIENCE and ERP inside weights (no Informatics concentrations)", () => {
    const informaticsConcentrations = [
      "CYBER_SECURITY",
      "IOT",
      "AI",
      "AI_HEALTHCARE",
      "GAME_DEVELOPMENT",
      "DEVOPS",
    ] as const;

    for (const question of informationSystemsQuestions) {
      for (const option of question.options) {
        for (const concentration of Object.keys(option.weights)) {
          expect(
            (INFORMATION_SYSTEMS_CONCENTRATIONS as readonly string[]).includes(
              concentration,
            ),
            `${question.id} / ${option.id}: unexpected concentration "${concentration}"`,
          ).toBe(true);
          expect(
            (informaticsConcentrations as readonly string[]).includes(
              concentration,
            ),
            `${question.id} / ${option.id} must not contain Informatics concentration "${concentration}"`,
          ).toBe(false);
        }
      }
    }
  });

  it("belongs entirely to the INFORMATION_SYSTEMS major", () => {
    for (const question of informationSystemsQuestions) {
      expect(question.major).toBe("INFORMATION_SYSTEMS");
    }
  });

  it("gives both concentrations meaningful coverage across many questions", () => {
    const coverage = getInformationSystemsCoverage();
    for (const concentration of INFORMATION_SYSTEMS_CONCENTRATIONS) {
      expect(
        coverage[concentration],
        `${concentration} should appear in at least 10 questions`,
      ).toBeGreaterThanOrEqual(10);
    }
  });

  it("offers interdisciplinary answers contributing to both concentrations", () => {
    const dualScoreQuestions = informationSystemsQuestions.filter((question) => {
      const canScoreDs = question.options.some(
        (option) => (option.weights.DATA_SCIENCE ?? 0) > 0,
      );
      const canScoreErp = question.options.some(
        (option) => (option.weights.ERP ?? 0) > 0,
      );
      return canScoreDs && canScoreErp;
    });

    expect(dualScoreQuestions.length).toBeGreaterThanOrEqual(6);
  });

  it("marks only a few questions as high-value tie breakers", () => {
    const tieBreakers = informationSystemsQuestions.filter(
      (q) => q.tieBreakerPriority !== undefined,
    );
    expect(tieBreakers.length).toBeLessThanOrEqual(4);
  });

  it("keeps maximum possible raw scores reasonably balanced", () => {
    const maxima = getInformationSystemsMaxScores();
    const values = Object.values(maxima);
    const lowest = Math.min(...values);
    const highest = Math.max(...values);

    for (const concentration of INFORMATION_SYSTEMS_CONCENTRATIONS) {
      expect(
        maxima[concentration],
        `${concentration} should offer a meaningful maximum score`,
      ).toBeGreaterThanOrEqual(40);
    }

    expect(highest - lowest, `max range ${lowest}–${highest}`).toBeLessThanOrEqual(10);
  });
});


describe("Information Systems validation failure detection", () => {
  function questionWithId(id: string): InformationSystemsQuestion {
    return {
      ...informationSystemsQuestions[0],
      id,
    };
  }

  it("rejects a wrong question count", () => {
    const subset = informationSystemsQuestions.slice(0, 19);
    expect(validateInformationSystemsQuestions(subset)).toContain(
      "Expected exactly 20 Information Systems questions, got 19.",
    );
  });

  it("rejects Informatics concentrations inside weights", () => {
    const broken: InformationSystemsQuestion = {
      ...informationSystemsQuestions[0],
      options: [
        {
          id: "IS_Q01_A",
          label: "Break",
          weights: { AI: 5 } as never,
        },
        {
          id: "IS_Q01_B",
          label: "OK",
          weights: {},
        },
      ],
    };
    const errors = validateInformationSystemsQuestions([broken]);
    expect(errors.some((error) => error.includes("invalid concentration"))).toBe(
      true,
    );
  });

  it("rejects duplicate question ids", () => {
    const duplicated = [questionWithId("IS_Q01"), questionWithId("IS_Q01")];
    expect(validateInformationSystemsQuestions(duplicated)).toContain(
      "IS_Q01: duplicate question id.",
    );
  });
});

