import { describe, expect, it } from "vitest";
import {
  informaticsQuestions,
  INFORMATICS_CONCENTRATIONS,
  type InformaticsQuestion,
} from "@/data/informaticsQuestions";
import {
  assertInformaticsQuestionsValid,
  getConcentrationCoverage,
  getMaxScoreByConcentration,
  getQuestionTypeCounts,
  validateInformaticsQuestions,
} from "@/lib/scoring-utils";

describe("Informatics questionnaire configuration", () => {
  it("contains exactly 20 questions", () => {
    expect(informaticsQuestions.length).toBe(20);
  });

  it("passes full configuration validation (IDs, weights, types, coverage, balance)", () => {
    expect(() => assertInformaticsQuestionsValid()).not.toThrow();
  });

  it("returns no validation errors", () => {
    expect(validateInformaticsQuestions()).toEqual([]);
  });

  it("uses the recommended question type distribution", () => {
    const counts = getQuestionTypeCounts();
    expect(counts.LIKERT).toBe(5);
    expect(counts.AGREEMENT).toBe(4);
    expect(counts.MULTIPLE_CHOICE).toBe(6);
    expect(counts.SCENARIO).toBe(3);
    expect(counts.PRIORITY).toBe(2);
  });

  it("uses unique question IDs following INF_Q01…INF_Q20", () => {
    const ids = informaticsQuestions.map((q) => q.id);
    expect(new Set(ids).size).toBe(20);
    expect(ids).toEqual(
      Array.from({ length: 20 }, (_, i) => `INF_Q${String(i + 1).padStart(2, "0")}`),
    );
  });

  it("uses unique option IDs within each question", () => {
    for (const question of informaticsQuestions) {
      const optionIds = question.options.map((o) => o.id);
      expect(new Set(optionIds).size).toBe(optionIds.length);
      for (const optionId of optionIds) {
        expect(optionId).toMatch(new RegExp(`^${question.id}_[A-Z]$`));
      }
    }
  });

  it("gives every question at least 2 answer options", () => {
    for (const question of informaticsQuestions) {
      expect(
        question.options.length,
        `expected ${question.id} to have at least 2 options`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps every weight between 0 and 5", () => {
    for (const question of informaticsQuestions) {
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

  it("does not use Information Systems concentrations (DATA_SCIENCE, ERP) in weights", () => {
    for (const question of informaticsQuestions) {
      for (const option of question.options) {
        const keys = Object.keys(option.weights);
        expect(keys).not.toContain("DATA_SCIENCE");
        expect(keys).not.toContain("ERP");
      }
    }
  });

  it("belongs entirely to the INFORMATICS major", () => {
    for (const question of informaticsQuestions) {
      expect(question.major).toBe("INFORMATICS");
    }
  });

  it("gives every concentration meaningful coverage across many questions", () => {
    const coverage = getConcentrationCoverage();
    for (const concentration of INFORMATICS_CONCENTRATIONS) {
      expect(
        coverage[concentration],
        `${concentration} should appear in at least 6 questions`,
      ).toBeGreaterThanOrEqual(6);
    }
  });

  it("VR-related questions contribute to both IOT and GAME_DEVELOPMENT", () => {
    const vrQuestions = informaticsQuestions.filter((question) =>
      [question.text, ...question.options.map((o) => o.label)].some((text) =>
        /\bvr\b|immersive/i.test(text),
      ),
    );

    expect(vrQuestions.length).toBeGreaterThanOrEqual(2);

    for (const question of vrQuestions) {
      const maxIot = Math.max(
        ...question.options.map((o) => o.weights.IOT ?? 0),
      );
      const maxGame = Math.max(
        ...question.options.map((o) => o.weights.GAME_DEVELOPMENT ?? 0),
      );
      expect(
        maxIot,
        `VR question ${question.id} should contribute to IOT`,
      ).toBeGreaterThan(0);
      expect(
        maxGame,
        `VR question ${question.id} should contribute to GAME_DEVELOPMENT`,
      ).toBeGreaterThan(0);
    }
  });

  it("keeps maximum possible raw scores reasonably balanced", () => {
    const maxima = getMaxScoreByConcentration();
    const values = Object.values(maxima);
    const lowest = Math.min(...values);
    const highest = Math.max(...values);

    for (const concentration of INFORMATICS_CONCENTRATIONS) {
      expect(
        maxima[concentration],
        `${concentration} should offer a meaningful maximum score`,
      ).toBeGreaterThanOrEqual(40);
    }

    expect(highest - lowest, `max range ${lowest}–${highest}`).toBeLessThanOrEqual(10);
  });

  it("marks only a few questions as high-value tie breakers", () => {
    const tieBreakers = informaticsQuestions.filter(
      (q) => q.tieBreakerPriority !== undefined,
    );
    expect(tieBreakers.length).toBeLessThanOrEqual(4);
  });
});

describe("validation failure detection", () => {
  function questionWithId(id: string): InformaticsQuestion {
    return {
      ...informaticsQuestions[0],
      id,
    };
  }

  it("rejects a wrong question count", () => {
    const subset = informaticsQuestions.slice(0, 19);
    expect(validateInformaticsQuestions(subset)).toContain(
      "Expected exactly 20 Informatics questions, got 19.",
    );
  });

  it("rejects non-Informatics concentrations inside weights", () => {
    const broken: InformaticsQuestion = {
      ...informaticsQuestions[0],
      options: [
        {
          id: "INF_Q01_A",
          label: "Break",
          weights: { ERP: 5 } as never,
        },
        {
          id: "INF_Q01_B",
          label: "OK",
          weights: {},
        },
      ],
    };
    const errors = validateInformaticsQuestions([broken]);
    expect(errors.some((error) => error.includes("invalid concentration"))).toBe(
      true,
    );
  });

  it("rejects duplicate question ids", () => {
    const duplicated = [questionWithId("INF_Q01"), questionWithId("INF_Q01")];
    expect(validateInformaticsQuestions(duplicated)).toContain(
      "INF_Q01: duplicate question id.",
    );
  });
});
