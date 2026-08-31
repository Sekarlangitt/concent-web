import { describe, expect, it } from "vitest";
import { getConcentrationLabel } from "@/data/concentrations";
import {
  CONFIDENCE_EXPLANATIONS,
  filterScoresForMajor,
  getConfidenceExplanation,
  getExpectedScoreCount,
  sortScoresDesc,
  validateStoredResult,
  type ResultScore,
} from "@/lib/results/result-utils";

/* --------------------------------------------------------------------------
 * Concentration display names (requirement 9) — reuses the existing helper.
 * ------------------------------------------------------------------------ */

describe("concentration display names", () => {
  it("maps every Informatics concentration to its user-facing label", () => {
    expect(getConcentrationLabel("CYBER_SECURITY")).toBe("Cyber Security");
    expect(getConcentrationLabel("IOT")).toBe("Internet of Things (IoT)");
    expect(getConcentrationLabel("AI")).toBe("Artificial Intelligence (AI)");
    expect(getConcentrationLabel("AI_HEALTHCARE")).toBe(
      "Artificial Intelligence (AI) in Healthcare",
    );
    expect(getConcentrationLabel("GAME_DEVELOPMENT")).toBe("Game Development");
    expect(getConcentrationLabel("DEVOPS")).toBe("DevOps");
  });

  it("maps every Information Systems concentration to its user-facing label", () => {
    expect(getConcentrationLabel("DATA_SCIENCE")).toBe("Data Science");
    expect(getConcentrationLabel("ERP")).toBe("Enterprise Resource Planning (ERP)");
  });
});

/* --------------------------------------------------------------------------
 * Expected score counts (requirements 40, 55, 56)
 * ------------------------------------------------------------------------ */

describe("getExpectedScoreCount", () => {
  it("expects exactly 6 scores for Informatics", () => {
    expect(getExpectedScoreCount("INFORMATICS")).toBe(6);
  });

  it("expects exactly 2 scores for Information Systems", () => {
    expect(getExpectedScoreCount("INFORMATION_SYSTEMS")).toBe(2);
  });
});

/* --------------------------------------------------------------------------
 * Major-set filtering (requirement 38)
 * ------------------------------------------------------------------------ */

describe("filterScoresForMajor", () => {
  const all: ResultScore[] = [
    { concentration: "CYBER_SECURITY", normalizedScore: 10, rawScore: 4 },
    { concentration: "IOT", normalizedScore: 20, rawScore: 5 },
    { concentration: "AI", normalizedScore: 30, rawScore: 6 },
    { concentration: "AI_HEALTHCARE", normalizedScore: 40, rawScore: 7 },
    { concentration: "GAME_DEVELOPMENT", normalizedScore: 50, rawScore: 8 },
    { concentration: "DEVOPS", normalizedScore: 60, rawScore: 9 },
    { concentration: "DATA_SCIENCE", normalizedScore: 70, rawScore: 10 },
    { concentration: "ERP", normalizedScore: 80, rawScore: 11 },
  ];

  it("keeps only the 6 Informatics concentrations", () => {
    const filtered = filterScoresForMajor(all, "INFORMATICS");
    expect(filtered.map((score) => score.concentration).sort()).toEqual(
      ["AI", "AI_HEALTHCARE", "CYBER_SECURITY", "DEVOPS", "GAME_DEVELOPMENT", "IOT"].sort(),
    );
  });

  it("keeps only the 2 Information Systems concentrations", () => {
    const filtered = filterScoresForMajor(all, "INFORMATION_SYSTEMS");
    expect(filtered.map((score) => score.concentration).sort()).toEqual([
      "DATA_SCIENCE",
      "ERP",
    ]);
  });

  it("drops a stray cross-major row instead of crashing", () => {
    const filtered = filterScoresForMajor(all, "INFORMATICS");
    expect(filtered.map((score) => score.concentration)).not.toContain("DATA_SCIENCE");
    expect(filtered.map((score) => score.concentration)).not.toContain("ERP");
  });
});

/* --------------------------------------------------------------------------
 * Deterministic ordering (requirement 23)
 * ------------------------------------------------------------------------ */

describe("sortScoresDesc", () => {
  it("sorts by normalized score descending", () => {
    const scores: ResultScore[] = [
      { concentration: "AI", normalizedScore: 62.5, rawScore: 30 },
      { concentration: "CYBER_SECURITY", normalizedScore: 73, rawScore: 40 },
      { concentration: "DEVOPS", normalizedScore: 41.2, rawScore: 20 },
    ];
    expect(sortScoresDesc(scores).map((score) => score.concentration)).toEqual([
      "CYBER_SECURITY",
      "AI",
      "DEVOPS",
    ]);
  });

  it("is deterministic on equal normalized scores (label tie-break)", () => {
    const scores: ResultScore[] = [
      { concentration: "IOT", normalizedScore: 50, rawScore: 25 },
      { concentration: "AI", normalizedScore: 50, rawScore: 25 },
    ];
    // Alphabetical label order is the final fallback, so this never depends on
    // database insertion order.
    expect(sortScoresDesc(scores).map((score) => score.concentration)).toEqual([
      "AI",
      "IOT",
    ]);
  });
});

/* --------------------------------------------------------------------------
 * validateStoredResult (requirements 38, 39, 40)
 * ------------------------------------------------------------------------ */

describe("validateStoredResult", () => {
  const informaticsScores: ResultScore[] = [
    { concentration: "CYBER_SECURITY", normalizedScore: 15.6, rawScore: 10 },
    { concentration: "IOT", normalizedScore: 4.1, rawScore: 3 },
    { concentration: "AI", normalizedScore: 100, rawScore: 60 },
    { concentration: "AI_HEALTHCARE", normalizedScore: 22, rawScore: 15 },
    { concentration: "GAME_DEVELOPMENT", normalizedScore: 9.1, rawScore: 7 },
    { concentration: "DEVOPS", normalizedScore: 9.5, rawScore: 8 },
  ];

  it("accepts a complete Informatics result and sorts it", () => {
    const validated = validateStoredResult({
      major: "INFORMATICS",
      recommendedConcentration: "AI",
      recommendedScore: 100,
      scores: informaticsScores,
    });
    expect(validated).not.toBeNull();
    expect(validated!.scores).toHaveLength(6);
    expect(validated!.scores[0].concentration).toBe("AI");
    expect(validated!.scores[0].normalizedScore).toBe(100);
    expect(validated!.secondConcentration).toBe("AI_HEALTHCARE");
    expect(validated!.gap).toBe(78);
  });

  it("accepts a complete Information Systems result (2 scores only)", () => {
    const validated = validateStoredResult({
      major: "INFORMATION_SYSTEMS",
      recommendedConcentration: "DATA_SCIENCE",
      recommendedScore: 100,
      scores: [
        { concentration: "DATA_SCIENCE", normalizedScore: 100, rawScore: 50 },
        { concentration: "ERP", normalizedScore: 7, rawScore: 4 },
      ],
    });
    expect(validated).not.toBeNull();
    expect(validated!.scores).toHaveLength(2);
    expect(validated!.scores.map((score) => score.concentration)).toEqual([
      "DATA_SCIENCE",
      "ERP",
    ]);
  });

  it("rejects a recommended concentration outside the major", () => {
    const validated = validateStoredResult({
      major: "INFORMATICS",
      recommendedConcentration: "ERP",
      recommendedScore: 50,
      scores: informaticsScores,
    });
    expect(validated).toBeNull();
  });

  it("rejects a result with missing score rows", () => {
    const incomplete = informaticsScores.slice(0, 5);
    const validated = validateStoredResult({
      major: "INFORMATICS",
      recommendedConcentration: "AI",
      recommendedScore: 100,
      scores: incomplete,
    });
    expect(validated).toBeNull();
  });

  it("accepts a complete result even when an extra cross-major row exists", () => {
    const withStray: ResultScore[] = [
      ...informaticsScores,
      { concentration: "ERP", normalizedScore: 99, rawScore: 55 },
    ];
    const validated = validateStoredResult({
      major: "INFORMATICS",
      recommendedConcentration: "AI",
      recommendedScore: 100,
      scores: withStray,
    });
    expect(validated).not.toBeNull();
    expect(validated!.scores).toHaveLength(6);
    expect(validated!.scores.some((score) => score.concentration === "ERP")).toBe(false);
  });
});

/* --------------------------------------------------------------------------
 * Confidence label copy (requirement 13)
 * ------------------------------------------------------------------------ */

describe("getConfidenceExplanation", () => {
  it("resolves every valid stored label", () => {
    expect(getConfidenceExplanation("High")?.explanation).toBe(
      CONFIDENCE_EXPLANATIONS.High,
    );
    expect(getConfidenceExplanation("Moderate")?.explanation).toBe(
      CONFIDENCE_EXPLANATIONS.Moderate,
    );
    expect(getConfidenceExplanation("Close Match")?.explanation).toBe(
      CONFIDENCE_EXPLANATIONS["Close Match"],
    );
  });

  it("returns null for missing or unexpected labels", () => {
    expect(getConfidenceExplanation(null)).toBeNull();
    expect(getConfidenceExplanation("Certain")).toBeNull();
  });
});

