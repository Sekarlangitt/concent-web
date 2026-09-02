import { describe, expect, it } from "vitest";

import { CONCENTRATIONS_BY_MAJOR, type Concentration } from "@/data/concentrations";
import { QUESTIONS_PER_MAJOR } from "@/lib/major";
import {
  MAX_WEIGHT,
  MIN_WEIGHT,
  computeConcentrationCoverage,
  computeTheoreticalMaxima,
  hasGapFreeOrders,
  validateQuestionnaireForPublish,
} from "@/lib/questionnaires/validation";
import type {
  QuestionOptionShape,
  QuestionShape,
  QuestionnaireVersionShape,
} from "@/lib/questionnaires/types";

/* --------------------------------------------------------------------------
 * Fixtures
 * ------------------------------------------------------------------------ */

function makeOption(
  order: number,
  label: string,
  weights: Partial<Record<Concentration, number>>,
  numericValue: number | null = null,
): QuestionOptionShape {
  return { id: `opt-${order}`, order, label, numericValue, weights };
}

function makeQuestion(
  order: number,
  text: string,
  options: QuestionOptionShape[],
  type: QuestionShape["type"] = "LIKERT",
): QuestionShape {
  return {
    id: `q-${order}`,
    order,
    type,
    text,
    helpText: null,
    category: null,
    isRequired: true,
    options,
  };
}

function makeVersion(
  major: QuestionnaireVersionShape["major"],
  questions: QuestionShape[],
): QuestionnaireVersionShape {
  return {
    id: "version-1",
    major,
    versionNumber: 1,
    status: "DRAFT",
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: null,
    questions,
  };
}

function validInformaticsVersion(): QuestionnaireVersionShape {
  const concentrations: readonly Concentration[] = [
    "CYBER_SECURITY",
    "IOT",
    "AI",
    "AI_HEALTHCARE",
    "GAME_DEVELOPMENT",
    "DEVOPS",
  ];
  const questions: QuestionShape[] = Array.from(
    { length: QUESTIONS_PER_MAJOR },
    (_, index) => {
      const order = index + 1;
      const target = concentrations[index % concentrations.length];
      return makeQuestion(
        order,
        `Informatics question ${order}`,
        [
          makeOption(1, "Strongly Disagree", { [target]: 0 }, 1),
          makeOption(2, "Disagree", { [target]: 1 }, 2),
          makeOption(3, "Neutral", { [target]: 2 }, 3),
          makeOption(4, "Agree", { [target]: 4 }, 4),
          makeOption(5, "Strongly Agree", { [target]: 5 }, 5),
        ],
        "LIKERT",
      );
    },
  );
  return makeVersion("INFORMATICS", questions);
}

/* --------------------------------------------------------------------------
 * hasGapFreeOrders / maxima / coverage
 * ------------------------------------------------------------------------ */

describe("questionnaire validation helpers", () => {
  it("hasGapFreeOrders accepts 1..N and rejects duplicates/gaps", () => {
    expect(hasGapFreeOrders([1, 2, 3])).toBe(true);
    expect(hasGapFreeOrders([3, 1, 2])).toBe(true);
    expect(hasGapFreeOrders([1, 3])).toBe(false);
    expect(hasGapFreeOrders([1, 2, 2])).toBe(false);
    expect(hasGapFreeOrders([])).toBe(false);
  });

  it("computes theoretical maxima from the highest weight per question", () => {
    const version = validInformaticsVersion();
    const maxima = computeTheoreticalMaxima(
      version.questions,
      CONCENTRATIONS_BY_MAJOR.INFORMATICS,
    );
    expect(maxima.CYBER_SECURITY).toBeGreaterThan(0);
    expect(maxima.IOT).toBeGreaterThan(0);
  });

  it("computes concentration coverage (questions where a concentration can score)", () => {
    const version = validInformaticsVersion();
    const coverage = computeConcentrationCoverage(
      version.questions,
      CONCENTRATIONS_BY_MAJOR.INFORMATICS,
    );
    expect(coverage.CYBER_SECURITY).toBe(4);
    expect(coverage.IOT).toBe(4);
    expect(coverage.AI).toBe(3);
    expect(coverage.DEVOPS).toBe(3);
  });
});

/* --------------------------------------------------------------------------
 * Publish validation
 * ------------------------------------------------------------------------ */

describe("validateQuestionnaireForPublish", () => {
  it("accepts a valid exactly-20 Informatics questionnaire", () => {
    const result = validateQuestionnaireForPublish(validInformaticsVersion());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.questionCount).toBe(QUESTIONS_PER_MAJOR);
    for (const concentration of CONCENTRATIONS_BY_MAJOR.INFORMATICS) {
      expect(result.theoreticalMaxima[concentration]).toBeGreaterThan(0);
    }
  });

  it("rejects 19 and 21 questions", () => {
    // 19 questions.
    const shortVersion = validInformaticsVersion();
    shortVersion.questions = shortVersion.questions.slice(0, 19);
    const shortResult = validateQuestionnaireForPublish(shortVersion);
    expect(shortResult.valid).toBe(false);
    expect(shortResult.errors.join(" ")).toContain("exactly 20 questions");

    // 21 questions.
    const longVersion = validInformaticsVersion();
    longVersion.questions = [
      ...longVersion.questions,
      makeQuestion(21, "Extra question", [
        makeOption(1, "No", { CYBER_SECURITY: 1 }),
        makeOption(2, "Yes", { CYBER_SECURITY: 1 }),
      ]),
    ];
    const longResult = validateQuestionnaireForPublish(longVersion);
    expect(longResult.valid).toBe(false);
    expect(longResult.errors.join(" ")).toContain("exactly 20 questions");
  });

  it("rejects a question with no options", () => {
    const version = validInformaticsVersion();
    version.questions[0] = makeQuestion(1, "No options here", []);
    const result = validateQuestionnaireForPublish(version);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("at least 2 answer options");
  });

  it("rejects an out-of-range weight", () => {
    const version = validInformaticsVersion();
    version.questions[0].options[0].weights.CYBER_SECURITY = MAX_WEIGHT + 1;
    const result = validateQuestionnaireForPublish(version);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("outside the allowed range");
  });

  it("rejects a negative weight", () => {
    const version = validInformaticsVersion();
    version.questions[0].options[0].weights.CYBER_SECURITY = -1;
    const result = validateQuestionnaireForPublish(version);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("outside the allowed range");
  });

  it("rejects a cross-major concentration weight (ERP inside Informatics)", () => {
    const version = validInformaticsVersion();
    version.questions[0].options[0].weights.ERP = 3;
    const result = validateQuestionnaireForPublish(version);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("does not belong to the INFORMATICS major");
  });

  it("rejects a concentration with a zero theoretical maximum", () => {
    const version = validInformaticsVersion();
    for (const question of version.questions) {
      for (const option of question.options) {
        delete option.weights.AI_HEALTHCARE;
        delete option.weights.AI;
        delete option.weights.GAME_DEVELOPMENT;
        delete option.weights.DEVOPS;
        delete option.weights.IOT;
        option.weights.CYBER_SECURITY = 1;
      }
    }
    const result = validateQuestionnaireForPublish(version);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain(
      "AI_HEALTHCARE currently has no scoring opportunities",
    );
  });

  it("rejects duplicate option orders", () => {
    const version = validInformaticsVersion();
    version.questions[0].options[0].order = version.questions[0].options[1].order;
    const result = validateQuestionnaireForPublish(version);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain(
      "option order must be deterministic",
    );
  });

  it("rejects an empty question text", () => {
    const version = validInformaticsVersion();
    version.questions[0].text = "   ";
    const result = validateQuestionnaireForPublish(version);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("must not be empty");
  });

  it("rejects duplicate question orders", () => {
    const version = validInformaticsVersion();
    version.questions[1].order = version.questions[0].order;
    const result = validateQuestionnaireForPublish(version);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("deterministic");
  });

  it("validates an exactly-20 Information Systems questionnaire with both maxima", () => {
    const questions: QuestionShape[] = Array.from(
      { length: QUESTIONS_PER_MAJOR },
      (_, index) => {
        const order = index + 1;
        const weights: Partial<Record<Concentration, number>> =
          index % 2 === 0 ? { DATA_SCIENCE: 5 } : { ERP: 5 };
        return makeQuestion(
          order,
          `IS question ${order}`,
          [makeOption(1, "No", weights), makeOption(2, "Yes", weights)],
          "AGREEMENT",
        );
      },
    );
    const result = validateQuestionnaireForPublish(
      makeVersion("INFORMATION_SYSTEMS", questions),
    );
    expect(result.valid).toBe(true);
    expect(result.theoreticalMaxima.DATA_SCIENCE).toBeGreaterThan(0);
    expect(result.theoreticalMaxima.ERP).toBeGreaterThan(0);
    expect(MIN_WEIGHT).toBe(0);
    expect(MAX_WEIGHT).toBe(5);
  });
});

