import { describe, expect, it } from "vitest";
import {
  AssessmentSubmissionError,
  scoreAssessment,
  type ScoreAssessmentInput,
} from "@/lib/scoring/score-assessment";
import { getConfidenceLabel } from "@/lib/scoring/confidence";
import {
  compareScoredDesc,
  countStrongResponses,
  FIXED_CONCENTRATION_PRIORITY,
  resolveTieBreak,
  STRONG_RESPONSE_WEIGHT,
} from "@/lib/scoring/tie-break";
import { clampNormalizedScore, normalizeScore, roundScore } from "@/lib/scoring/normalization";
import { getLegacyQuestionSet } from "@/lib/scoring/test-question-set";
import type { Major } from "@/lib/major";
import type { Concentration } from "@/data/concentrations";
import type { ScoredConcentration } from "@/lib/scoring/types";

/* --------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------ */

/**
 * Scoring tests drive the pure scorer with the LEGACY question bank (the
 * pre-database configuration that seeded the database). The scorer itself is
 * configuration-agnostic — it accepts any trusted question set.
 */
function getScoringQuestions(major: Major) {
  return getLegacyQuestionSet(major).questions;
}

type AnyQuestion = ReturnType<typeof getScoringQuestions>[number];

/** Builds one answer per question of the major using a per-question picker. */
function allAnswers(
  major: Major,
  pick: (question: AnyQuestion) => string,
): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const question of getScoringQuestions(major)) {
    answers[question.id] = pick(question);
  }
  return answers;
}

/**
 * Profile that gives `target` the maximum possible weight on every question,
 * i.e. the answer set that maximizes the target concentration's raw score.
 */
function strongestProfile(
  major: Major,
  target: Concentration,
): Record<string, string> {
  return allAnswers(major, (question) => {
    let bestId = question.options[0].id;
    let bestWeight = -1;
    for (const option of question.options) {
      const weights = option.weights as Partial<Record<Concentration, number>>;
      const weight = weights[target] ?? 0;
      if (weight > bestWeight) {
        bestWeight = weight;
        bestId = option.id;
      }
    }
    return bestId;
  });
}

function withOverrides(
  base: Record<string, string>,
  overrides: Record<string, string>,
): Record<string, string> {
  return { ...base, ...overrides };
}

function score(major: Major, answers: Record<string, string>) {
  return scoreAssessment({
    major,
    answers,
    questionSet: getLegacyQuestionSet(major),
  });
}

function expectNormalizedInRange(result: ReturnType<typeof scoreAssessment>) {
  for (const scored of result.scores) {
    expect(
      scored.normalizedScore,
      `${scored.concentration} normalized out of range`,
    ).toBeGreaterThanOrEqual(0);
    expect(
      scored.normalizedScore,
      `${scored.concentration} normalized out of range`,
    ).toBeLessThanOrEqual(100);
    expect(Number.isFinite(scored.normalizedScore)).toBe(true);
    expect(scored.normalizedScore).toBe(clampNormalizedScore(scored.normalizedScore));
  }
}

const INF_CONCENTRATIONS = [
  "CYBER_SECURITY",
  "IOT",
  "AI",
  "AI_HEALTHCARE",
  "GAME_DEVELOPMENT",
  "DEVOPS",
] as const;

const IS_CONCENTRATIONS = ["DATA_SCIENCE", "ERP"] as const;

/* --------------------------------------------------------------------------
 * Valid submissions
 * ------------------------------------------------------------------------ */

describe("scoreAssessment — valid submissions", () => {
  it("scores a fully valid Informatics submission", () => {
    const result = score("INFORMATICS", strongestProfile("INFORMATICS", "AI"));

    expect(result.major).toBe("INFORMATICS");
    expect(result.scores).toHaveLength(6);
    expect(result.scores.map((s) => s.concentration).sort()).toEqual([
      ...INF_CONCENTRATIONS,
    ].sort());
    expect(result.answers).toHaveLength(20);
    expect(result.recommendedConcentration).toBe("AI");
    expect(result.recommendedScore).toBe(100);
    expectNormalizedInRange(result);
  });

  it("scores a fully valid Information Systems submission", () => {
    const result = score(
      "INFORMATION_SYSTEMS",
      strongestProfile("INFORMATION_SYSTEMS", "DATA_SCIENCE"),
    );

    expect(result.major).toBe("INFORMATION_SYSTEMS");
    expect(result.scores).toHaveLength(2);
    expect(result.scores.map((s) => s.concentration).sort()).toEqual([
      ...IS_CONCENTRATIONS,
    ].sort());
    expect(result.answers).toHaveLength(20);
    expect(result.recommendedConcentration).toBe("DATA_SCIENCE");
    expectNormalizedInRange(result);
  });

  it("scores are ranked normalized desc, then raw desc", () => {
    const result = score("INFORMATICS", strongestProfile("INFORMATICS", "IOT"));
    for (let i = 1; i < result.scores.length; i += 1) {
      const prev = result.scores[i - 1];
      const current = result.scores[i];
      expect(
        prev.normalizedScore >= current.normalizedScore,
        `rank mismatch at ${i}`,
      ).toBe(true);
    }
  });
});

/* --------------------------------------------------------------------------
 * Strict validation
 * ------------------------------------------------------------------------ */

describe("scoreAssessment — strict validation", () => {
  function expectRejected(
    major: Major,
    answers: Record<string, string>,
    code: AssessmentSubmissionError["code"],
  ) {
    let caught: unknown;
    try {
      scoreAssessment({
        major,
        answers,
        questionSet: getLegacyQuestionSet(major),
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AssessmentSubmissionError);
    const err = caught as AssessmentSubmissionError;
    expect(err.code).toBe(code);
    return err;
  }

  it("rejects a missing question with a friendly message", () => {
    const complete = strongestProfile("INFORMATICS", "AI");
    const missing: Record<string, string> = { ...complete };
    delete missing.INF_Q01;

    const error = expectRejected("INFORMATICS", missing, "incomplete");
    expect(error.message).toContain("incomplete");
  });

  it("rejects an unknown question id (INF_Q99)", () => {
    const answers = withOverrides(strongestProfile("INFORMATICS", "AI"), {
      INF_Q99: "INF_Q99_A",
    });
    expectRejected("INFORMATICS", answers, "invalid-answer");
  });

  it("rejects an invalid answer id", () => {
    const answers = withOverrides(strongestProfile("INFORMATICS", "AI"), {
      INF_Q01: "INF_Q01_NOT_REAL",
    });
    expectRejected("INFORMATICS", answers, "invalid-answer");
  });

  it("rejects a cross-major question key (IS_Q01 inside Informatics)", () => {
    const answers = withOverrides(strongestProfile("INFORMATICS", "AI"), {
      IS_Q01: "IS_Q01_A",
    });
    expectRejected("INFORMATICS", answers, "invalid-answer");
  });

  it("rejects a cross-major answer value (IS_Q01_A for INF_Q01)", () => {
    const answers = withOverrides(strongestProfile("INFORMATICS", "AI"), {
      INF_Q01: "IS_Q01_A",
    });
    expectRejected("INFORMATICS", answers, "invalid-answer");
  });

  it("rejects Informatics question ids inside an Information Systems submission", () => {
    const answers = withOverrides(
      strongestProfile("INFORMATION_SYSTEMS", "ERP"),
      { INF_Q01: "INF_Q01_A" },
    );
    expectRejected("INFORMATION_SYSTEMS", answers, "invalid-answer");
  });

  it("rejects an empty question set as questionnaire-misconfigured", () => {
    let caught: unknown;
    try {
      scoreAssessment({
        major: "INFORMATICS",
        answers: {},
        questionSet: { questions: [], concentrations: [] },
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AssessmentSubmissionError);
    expect((caught as AssessmentSubmissionError).code).toBe(
      "questionnaire-misconfigured",
    );
  });
});

/* --------------------------------------------------------------------------
 * Client-supplied fields cannot influence scoring
 * ------------------------------------------------------------------------ */

describe("scoreAssessment — client-supplied score fields are ignored", () => {
  it("ignores rawScore, normalizedScore, recommendation, and weights from the client", () => {
    const cleanAnswers = strongestProfile("INFORMATICS", "CYBER_SECURITY");
    const clean = scoreAssessment({
      major: "INFORMATICS",
      answers: cleanAnswers,
      questionSet: getLegacyQuestionSet("INFORMATICS"),
    });

    const tampered = scoreAssessment({
      major: "INFORMATICS",
      answers: cleanAnswers,
      questionSet: getLegacyQuestionSet("INFORMATICS"),
      rawScore: 999,
      normalizedScore: 1,
      recommendedConcentration: "ERP",
      recommendedScore: 1,
      confidenceLabel: "High",
      weights: { ERP: 5 },
    } as unknown as ScoreAssessmentInput);

    expect(tampered).toEqual(clean);
    expect(tampered.recommendedConcentration).toBe("CYBER_SECURITY");
  });
});

/* --------------------------------------------------------------------------
 * Normalization & maximum scores
 * ------------------------------------------------------------------------ */

describe("scoreAssessment — normalization and maximum scores", () => {
  it("keeps normalized scores within 0–100 for many profiles", () => {
    for (const target of INF_CONCENTRATIONS) {
      expectNormalizedInRange(
        score("INFORMATICS", strongestProfile("INFORMATICS", target)),
      );
    }
    for (const target of IS_CONCENTRATIONS) {
      expectNormalizedInRange(
        score("INFORMATION_SYSTEMS", strongestProfile("INFORMATION_SYSTEMS", target)),
      );
    }
  });

  it("uses the documented Informatics theoretical maximums (45/49/46/41/44/42)", () => {
    const expected: Record<(typeof INF_CONCENTRATIONS)[number], number> = {
      CYBER_SECURITY: 45,
      IOT: 49,
      AI: 46,
      AI_HEALTHCARE: 41,
      GAME_DEVELOPMENT: 44,
      DEVOPS: 42,
    };
    for (const target of INF_CONCENTRATIONS) {
      const result = score("INFORMATICS", strongestProfile("INFORMATICS", target));
      const scored = result.scores.find((s) => s.concentration === target);
      expect(scored?.maxScore).toBe(expected[target]);
    }
  });

  it("a strongest profile reaches the theoretical maximum (raw === max, 100%)", () => {
    for (const target of INF_CONCENTRATIONS) {
      const result = score("INFORMATICS", strongestProfile("INFORMATICS", target));
      const scored = result.scores.find((s) => s.concentration === target);
      expect(scored?.rawScore).toBe(scored?.maxScore);
      expect(scored?.normalizedScore).toBe(100);
    }
    for (const target of IS_CONCENTRATIONS) {
      const result = score(
        "INFORMATION_SYSTEMS",
        strongestProfile("INFORMATION_SYSTEMS", target),
      );
      const scored = result.scores.find((s) => s.concentration === target);
      expect(scored?.rawScore).toBe(scored?.maxScore);
      expect(scored?.normalizedScore).toBe(100);
    }
  });

  it("rounds normalized scores to one decimal place (matches stored values)", () => {
    const result = score("INFORMATICS", strongestProfile("INFORMATICS", "DEVOPS"));
    for (const scored of result.scores) {
      expect(scored.normalizedScore).toBe(roundScore(scored.normalizedScore));
    }
  });
});

describe("normalizeScore / roundScore / clampNormalizedScore — pure helpers", () => {
  it("normalizes raw/max to 0–100 with one decimal", () => {
    expect(normalizeScore(32, 40)).toBe(80);
    expect(normalizeScore(27, 41)).toBe(65.9);
    expect(normalizeScore(30, 49)).toBe(61.2);
    expect(normalizeScore(0, 40)).toBe(0);
    expect(normalizeScore(45, 45)).toBe(100);
  });

  it("handles a zero maximum safely", () => {
    expect(normalizeScore(0, 0)).toBe(0);
    expect(normalizeScore(5, 0)).toBe(0);
  });

  it("clamps floating-point edge cases", () => {
    expect(normalizeScore(50, 40)).toBe(100); // 125% → clamped
    expect(clampNormalizedScore(-0.00001)).toBe(0);
    expect(clampNormalizedScore(100.0000004)).toBe(100);
    expect(roundScore(80.00000000000001)).toBe(80);
    expect(roundScore(65.9)).toBe(65.9);
  });
});

/* --------------------------------------------------------------------------
 * Recommendation profiles
 * ------------------------------------------------------------------------ */

describe("scoreAssessment — Informatics profiles", () => {
  it.each([...INF_CONCENTRATIONS] as const)(
    "a profile strongly favoring %s recommends %s",
    (target) => {
      const result = score("INFORMATICS", strongestProfile("INFORMATICS", target));
      expect(result.recommendedConcentration).toBe(target);
    },
  );
});

describe("scoreAssessment — Information Systems profiles", () => {
  it("a Data Science profile recommends DATA_SCIENCE", () => {
    const result = score(
      "INFORMATION_SYSTEMS",
      strongestProfile("INFORMATION_SYSTEMS", "DATA_SCIENCE"),
    );
    expect(result.recommendedConcentration).toBe("DATA_SCIENCE");
  });

  it("an ERP profile recommends ERP", () => {
    const result = score(
      "INFORMATION_SYSTEMS",
      strongestProfile("INFORMATION_SYSTEMS", "ERP"),
    );
    expect(result.recommendedConcentration).toBe("ERP");
  });

  it("a close/mixed profile keeps both concentrations reasonably close (Close Match)", () => {
    // Evenly spread answers: DATA_SCIENCE and ERP both end at raw 22, which
    // normalizes to 29.3 vs 31.0 — a gap far below the "High" threshold.
    const balanced = {
      IS_Q01: "IS_Q01_A",
      IS_Q02: "IS_Q02_A",
      IS_Q03: "IS_Q03_A",
      IS_Q04: "IS_Q04_A",
      IS_Q05: "IS_Q05_A",
      IS_Q06: "IS_Q06_A",
      IS_Q07: "IS_Q07_A",
      IS_Q08: "IS_Q08_A",
      IS_Q09: "IS_Q09_A",
      IS_Q10: "IS_Q10_A",
      IS_Q11: "IS_Q11_B",
      IS_Q12: "IS_Q12_A",
      IS_Q13: "IS_Q13_B",
      IS_Q14: "IS_Q14_C",
      IS_Q15: "IS_Q15_E",
      IS_Q16: "IS_Q16_C",
      IS_Q17: "IS_Q17_C",
      IS_Q18: "IS_Q18_D",
      IS_Q19: "IS_Q19_A",
      IS_Q20: "IS_Q20_A",
    };

    const result = score("INFORMATION_SYSTEMS", balanced);
    expect(result.confidenceLabel).toBe("Close Match");
    expect(result.explanation.gap).not.toBeNull();
    expect(result.explanation.gap!).toBeLessThan(7);
  });
});

/* --------------------------------------------------------------------------
 * VR profiles (interdisciplinary weights from STEP 4)
 * ------------------------------------------------------------------------ */

describe("scoreAssessment — VR profiles", () => {
  it("Profile A (immersive VR gameplay / 3D interaction) favors Game Development", () => {
    const profile = withOverrides(
      strongestProfile("INFORMATICS", "GAME_DEVELOPMENT"),
      {
        INF_Q11: "INF_Q11_A", // design the 3D world and how visitors interact
        INF_Q15: "INF_Q15_C", // VR level where the player moves through 3D space
        INF_Q17: "INF_Q17_A", // creating the VR world, 3D models, hands-on interaction
      },
    );
    const result = score("INFORMATICS", profile);

    expect(result.recommendedConcentration).toBe("GAME_DEVELOPMENT");
    const game = result.scores.find((s) => s.concentration === "GAME_DEVELOPMENT");
    const iot = result.scores.find((s) => s.concentration === "IOT");
    expect(game!.normalizedScore).toBeGreaterThan(iot!.normalizedScore);
  });

  it("Profile B (VR with wearables, motion tracking, connected hardware) favors IoT", () => {
    const profile = withOverrides(strongestProfile("INFORMATICS", "IOT"), {
      INF_Q11: "INF_Q11_B", // wearable motion-tracking gear and sensor network
      INF_Q17: "INF_Q17_B", // wiring motion sensors and haptic wearables
    });
    const result = score("INFORMATICS", profile);

    expect(result.recommendedConcentration).toBe("IOT");
    const iot = result.scores.find((s) => s.concentration === "IOT");
    const game = result.scores.find((s) => s.concentration === "GAME_DEVELOPMENT");
    expect(iot!.normalizedScore).toBeGreaterThan(game!.normalizedScore);
  });
});

/* --------------------------------------------------------------------------
 * AI vs AI Healthcare differentiation
 * ------------------------------------------------------------------------ */

describe("scoreAssessment — AI vs AI Healthcare differentiation", () => {
  it("general AI interest (models/algorithms/patterns, no healthcare) favors AI", () => {
    const generalAI = allAnswers("INFORMATICS", (question) => {
      let best = question.options[0].id;
      let bestScore = -Infinity;
      for (const option of question.options) {
        const weights = option.weights as Partial<Record<Concentration, number>>;
        const score = (weights.AI ?? 0) - (weights.AI_HEALTHCARE ?? 0);
        if (score > bestScore) {
          bestScore = score;
          best = option.id;
        }
      }
      return best;
    });

    const result = score("INFORMATICS", generalAI);
    expect(result.recommendedConcentration).toBe("AI");

    const ai = result.scores.find((s) => s.concentration === "AI");
    const aiHealth = result.scores.find((s) => s.concentration === "AI_HEALTHCARE");
    expect(ai!.normalizedScore).toBeGreaterThan(aiHealth!.normalizedScore);
  });

  it("healthcare-focused AI interest (imaging/monitoring/clinical data) favors AI_HEALTHCARE", () => {
    const result = score(
      "INFORMATICS",
      strongestProfile("INFORMATICS", "AI_HEALTHCARE"),
    );
    expect(result.recommendedConcentration).toBe("AI_HEALTHCARE");

    const aiHealth = result.scores.find((s) => s.concentration === "AI_HEALTHCARE");
    const ai = result.scores.find((s) => s.concentration === "AI");
    expect(aiHealth!.normalizedScore).toBeGreaterThan(ai!.normalizedScore);
  });
});

/* --------------------------------------------------------------------------
 * Confidence labels
 * ------------------------------------------------------------------------ */

describe("scoreAssessment — confidence label integration", () => {
  it("labels a strongly dominant profile as High", () => {
    const result = score("INFORMATICS", strongestProfile("INFORMATICS", "AI"));
    expect(result.confidenceLabel).toBe("High");
    expect(result.explanation.gap!).toBeGreaterThanOrEqual(15);
  });

  it("labels a close mixed profile as Close Match (gap < 7)", () => {
    const mixed = {
      INF_Q01: "INF_Q01_E",
      INF_Q02: "INF_Q02_E",
      INF_Q03: "INF_Q03_A",
      INF_Q04: "INF_Q04_E",
      INF_Q05: "INF_Q05_A",
      INF_Q06: "INF_Q06_E",
      INF_Q07: "INF_Q07_E",
      INF_Q08: "INF_Q08_A",
      INF_Q09: "INF_Q09_E",
      INF_Q10: "INF_Q10_B",
      INF_Q11: "INF_Q11_B",
      INF_Q12: "INF_Q12_C",
      INF_Q13: "INF_Q13_C",
      INF_Q14: "INF_Q14_F",
      INF_Q15: "INF_Q15_F",
      INF_Q16: "INF_Q16_A",
      INF_Q17: "INF_Q17_B",
      INF_Q18: "INF_Q18_E",
      INF_Q19: "INF_Q19_A",
      INF_Q20: "INF_Q20_E",
    };
    const result = score("INFORMATICS", mixed);
    expect(result.confidenceLabel).toBe("Close Match");
    expect(result.explanation.gap!).toBeLessThan(7);
  });
});

describe("getConfidenceLabel — documented thresholds", () => {
  // High: gap >= 15   Moderate: 7 <= gap < 15   Close Match: gap < 7
  it("marks a gap of 15 as High", () => {
    expect(getConfidenceLabel(15)).toBe("High");
  });
  it("marks a gap below 15 as Moderate", () => {
    expect(getConfidenceLabel(14.9)).toBe("Moderate");
  });
  it("marks a gap of exactly 7 as Moderate", () => {
    expect(getConfidenceLabel(7)).toBe("Moderate");
  });
  it("marks a gap below 7 as Close Match", () => {
    expect(getConfidenceLabel(6.9)).toBe("Close Match");
    expect(getConfidenceLabel(0)).toBe("Close Match");
  });
  it("handles the defensive single-concentration case as High", () => {
    expect(getConfidenceLabel(null)).toBe("High");
  });
});

/* --------------------------------------------------------------------------
 * Ties and determinism
 * ------------------------------------------------------------------------ */

describe("scoreAssessment — deterministic tie handling", () => {
  /**
   * Information Systems rounded tie: DATA_SCIENCE and ERP both normalize to
   * 50.7 (raw 38/75 vs raw 36/71). The raw-score stage decides: DATA_SCIENCE
   * (higher raw). Verified deterministically across repeated runs.
   */
  const isRoundedTie = {
    IS_Q01: "IS_Q01_E",
    IS_Q02: "IS_Q02_C",
    IS_Q03: "IS_Q03_D",
    IS_Q04: "IS_Q04_D",
    IS_Q05: "IS_Q05_B",
    IS_Q06: "IS_Q06_A",
    IS_Q07: "IS_Q07_C",
    IS_Q08: "IS_Q08_C",
    IS_Q09: "IS_Q09_D",
    IS_Q10: "IS_Q10_C",
    IS_Q11: "IS_Q11_A",
    IS_Q12: "IS_Q12_E",
    IS_Q13: "IS_Q13_D",
    IS_Q14: "IS_Q14_D",
    IS_Q15: "IS_Q15_B",
    IS_Q16: "IS_Q16_A",
    IS_Q17: "IS_Q17_C",
    IS_Q18: "IS_Q18_D",
    IS_Q19: "IS_Q19_C",
    IS_Q20: "IS_Q20_C",
  };

  /**
   * Strong-response count for the new deterministic tie rule
   * (normalized → strong responses with weight >= 4 → fixed priority).
   */
  function countStrongResponsesFor(
    major: Major,
    target: Concentration,
    answers: Record<string, string>,
  ): number {
    let count = 0;
    for (const question of getScoringQuestions(major)) {
      const option = question.options.find(
        (candidate) => candidate.id === answers[question.id],
      );
      const weights = option?.weights as
        | Partial<Record<Concentration, number>>
        | undefined;
      if ((weights?.[target] ?? 0) >= STRONG_RESPONSE_WEIGHT) {
        count += 1;
      }
    }
    return count;
  }

  it("resolves an IS rounded tie deterministically (DATA_SCIENCE wins)", () => {
    const result = score("INFORMATION_SYSTEMS", isRoundedTie);

    const ds = result.scores.find((s) => s.concentration === "DATA_SCIENCE");
    const erp = result.scores.find((s) => s.concentration === "ERP");
    expect(ds!.normalizedScore).toBe(50.7);
    expect(erp!.normalizedScore).toBe(50.7);

    const dsStrong = countStrongResponsesFor(
      "INFORMATION_SYSTEMS",
      "DATA_SCIENCE",
      isRoundedTie,
    );
    const erpStrong = countStrongResponsesFor(
      "INFORMATION_SYSTEMS",
      "ERP",
      isRoundedTie,
    );
    expect(result.recommendedConcentration).toBe("DATA_SCIENCE");
    // The tie is never decided by randomness: either the strong-response
    // stage picked the leader, or the fixed priority order decided it.
    expect(["strong-responses", "fixed-priority"]).toContain(
      result.explanation.tieBreakStage,
    );
    if (result.explanation.tieBreakStage === "strong-responses") {
      expect(dsStrong).toBeGreaterThan(erpStrong);
    }
  });

  it("resolves an Informatics rounded tie deterministically (CYBER_SECURITY wins)", () => {
    const infRoundedTie = {
      INF_Q01: "INF_Q01_D",
      INF_Q02: "INF_Q02_C",
      INF_Q03: "INF_Q03_A",
      INF_Q04: "INF_Q04_A",
      INF_Q05: "INF_Q05_A",
      INF_Q06: "INF_Q06_D",
      INF_Q07: "INF_Q07_A",
      INF_Q08: "INF_Q08_A",
      INF_Q09: "INF_Q09_D",
      INF_Q10: "INF_Q10_D",
      INF_Q11: "INF_Q11_B",
      INF_Q12: "INF_Q12_A",
      INF_Q13: "INF_Q13_D",
      INF_Q14: "INF_Q14_F",
      INF_Q15: "INF_Q15_B",
      INF_Q16: "INF_Q16_A",
      INF_Q17: "INF_Q17_E",
      INF_Q18: "INF_Q18_B",
      INF_Q19: "INF_Q19_C",
      INF_Q20: "INF_Q20_B",
    };
    const result = score("INFORMATICS", infRoundedTie);

    const cyber = result.scores.find((s) => s.concentration === "CYBER_SECURITY");
    const devops = result.scores.find((s) => s.concentration === "DEVOPS");
    expect(cyber!.normalizedScore).toBe(33.3);
    expect(devops!.normalizedScore).toBe(33.3);

    const cyberStrong = countStrongResponsesFor(
      "INFORMATICS",
      "CYBER_SECURITY",
      infRoundedTie,
    );
    const devopsStrong = countStrongResponsesFor(
      "INFORMATICS",
      "DEVOPS",
      infRoundedTie,
    );
    expect(result.recommendedConcentration).toBe("CYBER_SECURITY");
    expect(["strong-responses", "fixed-priority"]).toContain(
      result.explanation.tieBreakStage,
    );
    if (result.explanation.tieBreakStage === "strong-responses") {
      expect(cyberStrong).toBeGreaterThan(devopsStrong);
    }
  });

  it("produces identical results for the same answers every time (no randomness)", () => {
    for (const major of ["INFORMATICS", "INFORMATION_SYSTEMS"] as const) {
      const answers =
        major === "INFORMATICS"
          ? strongestProfile("INFORMATICS", "GAME_DEVELOPMENT")
          : strongestProfile("INFORMATION_SYSTEMS", "ERP");

      const first = JSON.stringify(score(major, answers));
      for (let run = 0; run < 5; run += 1) {
        expect(JSON.stringify(score(major, answers))).toBe(first);
      }
    }
  });

  it("produces identical results for the tie profile every time", () => {
    const first = JSON.stringify(score("INFORMATION_SYSTEMS", isRoundedTie));
    for (let run = 0; run < 5; run += 1) {
      expect(JSON.stringify(score("INFORMATION_SYSTEMS", isRoundedTie))).toBe(first);
    }
  });
});

/* --------------------------------------------------------------------------
 * Raw vs normalized ranking
 * ------------------------------------------------------------------------ */

describe("scoreAssessment — recommendation uses normalized, not raw scores", () => {
  /**
   * Deliberately mixed profile. IOT collects more RAW points (30) than
   * AI_HEALTHCARE (27), but AI_HEALTHCARE's theoretical maximum is lower (41
   * vs IOT's 49), so its NORMALIZED score (65.9) beats IOT's (61.2). The
   * recommendation must therefore be AI_HEALTHCARE even though IOT has the
   * highest raw score.
   */
  const mixed = {
    INF_Q01: "INF_Q01_E",
    INF_Q02: "INF_Q02_E",
    INF_Q03: "INF_Q03_A",
    INF_Q04: "INF_Q04_E",
    INF_Q05: "INF_Q05_A",
    INF_Q06: "INF_Q06_E",
    INF_Q07: "INF_Q07_E",
    INF_Q08: "INF_Q08_A",
    INF_Q09: "INF_Q09_E",
    INF_Q10: "INF_Q10_B",
    INF_Q11: "INF_Q11_B",
    INF_Q12: "INF_Q12_C",
    INF_Q13: "INF_Q13_C",
    INF_Q14: "INF_Q14_F",
    INF_Q15: "INF_Q15_F",
    INF_Q16: "INF_Q16_A",
    INF_Q17: "INF_Q17_B",
    INF_Q18: "INF_Q18_E",
    INF_Q19: "INF_Q19_A",
    INF_Q20: "INF_Q20_E",
  };

  it("recommends the normalized winner even when another concentration has more raw points", () => {
    const result = score("INFORMATICS", mixed);

    const iot = result.scores.find((s) => s.concentration === "IOT");
    const aiHealth = result.scores.find((s) => s.concentration === "AI_HEALTHCARE");

    expect(iot!.rawScore).toBeGreaterThan(aiHealth!.rawScore); // raw says IOT
    expect(aiHealth!.normalizedScore).toBeGreaterThan(iot!.normalizedScore); // normalized says AI_HEALTHCARE
    expect(result.recommendedConcentration).toBe("AI_HEALTHCARE"); // normalized wins
    expect(result.recommendedScore).toBe(aiHealth!.normalizedScore);
  });
});

/* --------------------------------------------------------------------------
 * resolveTieBreak — deterministic stages (pure functions)
 * ------------------------------------------------------------------------ */

function syntheticScore(
  concentration: Concentration,
  normalizedScore: number,
  rawScore: number,
): ScoredConcentration {
  return { concentration, rawScore, maxScore: 100, normalizedScore };
}

const EMPTY_TIE_CONTEXT = {
  major: "INFORMATICS" as Major,
  weightsByQuestion: {} as Record<Concentration, Record<string, number>>,
};

describe("resolveTieBreak — deterministic tie stages", () => {
  it("stage 1: the unique highest normalized score wins", () => {
    const outcome = resolveTieBreak(
      [
        syntheticScore("IOT", 80, 40),
        syntheticScore("AI", 75, 40),
        syntheticScore("CYBER_SECURITY", 70, 40),
      ],
      EMPTY_TIE_CONTEXT,
    );
    expect(outcome.winner.concentration).toBe("IOT");
    expect(outcome.stage).toBe("normalized-score");
  });

  it("stage 2: equal normalized scores fall back to the most strong responses", () => {
    const outcome = resolveTieBreak(
      [
        syntheticScore("AI", 80, 40),
        syntheticScore("DEVOPS", 80, 38),
      ],
      {
        major: "INFORMATICS",
        weightsByQuestion: {
          AI: { INF_Q01: 3, INF_Q02: 4 },
          DEVOPS: { INF_Q01: 3 },
        } as unknown as Record<Concentration, Record<string, number>>,
      },
    );
    expect(outcome.winner.concentration).toBe("AI");
    expect(outcome.stage).toBe("strong-responses");
  });

  it("stage 2 counts only weights at or above the strong threshold", () => {
    const context = {
      major: "INFORMATICS" as Major,
      weightsByQuestion: {
        AI: { INF_Q01: 4, INF_Q02: 5 },
        DEVOPS: { INF_Q01: 4, INF_Q02: 3 },
      } as unknown as Record<Concentration, Record<string, number>>,
    };
    expect(countStrongResponses(context, "AI")).toBe(2);
    expect(countStrongResponses(context, "DEVOPS")).toBe(1);
    expect(STRONG_RESPONSE_WEIGHT).toBe(4);
  });

  it("stage 3: full score ties fall back to the fixed priority order (Informatics)", () => {
    const outcome = resolveTieBreak(
      [
        syntheticScore("AI", 80, 40),
        syntheticScore("CYBER_SECURITY", 80, 40),
        syntheticScore("IOT", 80, 40),
      ],
      EMPTY_TIE_CONTEXT,
    );
    expect(outcome.winner.concentration).toBe("CYBER_SECURITY");
    expect(outcome.stage).toBe("fixed-priority");
  });

  it("stage 3: full ties fall back to the fixed priority order (Information Systems)", () => {
    const outcome = resolveTieBreak(
      [
        syntheticScore("ERP", 90, 40),
        syntheticScore("DATA_SCIENCE", 90, 40),
      ],
      { ...EMPTY_TIE_CONTEXT, major: "INFORMATION_SYSTEMS" },
    );
    expect(outcome.winner.concentration).toBe("DATA_SCIENCE");
    expect(outcome.stage).toBe("fixed-priority");
  });
});

describe("FIXED_CONCENTRATION_PRIORITY — documented fallback order", () => {
  it("matches the documented Informatics order", () => {
    expect(FIXED_CONCENTRATION_PRIORITY.INFORMATICS).toEqual([
      "CYBER_SECURITY",
      "IOT",
      "AI",
      "AI_HEALTHCARE",
      "GAME_DEVELOPMENT",
      "DEVOPS",
    ]);
  });

  it("matches the documented Information Systems order", () => {
    expect(FIXED_CONCENTRATION_PRIORITY.INFORMATION_SYSTEMS).toEqual([
      "DATA_SCIENCE",
      "ERP",
      "BPA",
    ]);
  });
});

describe("compareScoredDesc — explicit stable ranking", () => {
  it("sorts by normalized desc then raw desc and treats equal scores as equal", () => {
    const scores = [
      syntheticScore("DEVOPS", 60, 30),
      syntheticScore("AI", 80, 30),
      syntheticScore("IOT", 80, 40),
      syntheticScore("CYBER_SECURITY", 80, 40),
    ];
    const sorted = [...scores].sort(compareScoredDesc);
    expect(sorted.map((s) => s.concentration)).toEqual([
      "IOT",
      "CYBER_SECURITY",
      "AI",
      "DEVOPS",
    ]);
  });
});

/* --------------------------------------------------------------------------
 * Numeric values, explanation metadata, major isolation
 * ------------------------------------------------------------------------ */

describe("scoreAssessment — numericValue on answers", () => {
  it("stores ordinals (1–5) for LIKERT/AGREEMENT/PRIORITY and null elsewhere", () => {
    const result = score("INFORMATICS", strongestProfile("INFORMATICS", "AI"));

    const answerByQuestion = new Map(
      result.answers.map((answer) => [answer.questionId, answer]),
    );

    // INF_Q03 is LIKERT; the strongest-AI option is the 5th option (E).
    expect(answerByQuestion.get("INF_Q03")?.answerKey).toBe("INF_Q03_E");
    expect(answerByQuestion.get("INF_Q03")?.numericValue).toBe(5);

    // INF_Q06 is AGREEMENT; strongest-AI option is the 1st option (A).
    expect(answerByQuestion.get("INF_Q06")?.answerKey).toBe("INF_Q06_A");
    expect(answerByQuestion.get("INF_Q06")?.numericValue).toBe(1);

    // INF_Q19 is PRIORITY; strongest-AI option is the 1st option (A).
    expect(answerByQuestion.get("INF_Q19")?.answerKey).toBe("INF_Q19_A");
    expect(answerByQuestion.get("INF_Q19")?.numericValue).toBe(1);

    // INF_Q10 is MULTIPLE_CHOICE → no ordinal value.
    expect(answerByQuestion.get("INF_Q10")?.numericValue).toBeNull();
    // INF_Q16 is SCENARIO → no ordinal value.
    expect(answerByQuestion.get("INF_Q16")?.numericValue).toBeNull();
  });
});

describe("scoreAssessment — explanation metadata", () => {
  it("identifies top/second concentration, gap, strongest categories and answers", () => {
    const result = score(
      "INFORMATICS",
      strongestProfile("INFORMATICS", "GAME_DEVELOPMENT"),
    );

    expect(result.explanation.topConcentration).toBe("GAME_DEVELOPMENT");
    expect(result.explanation.secondConcentration).not.toBeNull();
    expect(result.explanation.gap).not.toBeNull();
    expect(result.explanation.strongestCategories.length).toBeGreaterThan(0);
    expect(result.explanation.strongestAnswers.length).toBeGreaterThan(0);
    // The strongest answers must actually contribute to the winner.
    for (const answer of result.explanation.strongestAnswers) {
      const resolved = result.answers.find(
        (a) => a.questionId === answer.questionId,
      );
      expect(resolved?.weights.GAME_DEVELOPMENT ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("scoreAssessment — major isolation", () => {
  it("an Informatics assessment never scores DATA_SCIENCE or ERP", () => {
    const result = score("INFORMATICS", strongestProfile("INFORMATICS", "AI"));
    const concentrations = result.scores.map((s) => s.concentration);
    expect(concentrations).not.toContain("DATA_SCIENCE");
    expect(concentrations).not.toContain("ERP");
  });

  it("an Information Systems assessment never scores Informatics concentrations", () => {
    const result = score(
      "INFORMATION_SYSTEMS",
      strongestProfile("INFORMATION_SYSTEMS", "DATA_SCIENCE"),
    );
    const concentrations = result.scores.map((s) => s.concentration);
    expect(concentrations).not.toContain("CYBER_SECURITY");
    expect(concentrations).not.toContain("IOT");
    expect(concentrations).not.toContain("AI");
    expect(concentrations).not.toContain("AI_HEALTHCARE");
    expect(concentrations).not.toContain("GAME_DEVELOPMENT");
    expect(concentrations).not.toContain("DEVOPS");
  });
});
