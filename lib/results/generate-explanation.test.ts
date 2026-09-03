import { describe, expect, it } from "vitest";
import type { Concentration } from "@/data/concentrations";
import type { Major } from "@/lib/major";
import { scoreAssessment } from "@/lib/scoring/score-assessment";
import { getLegacyQuestionSet } from "@/lib/scoring/test-question-set";
import {
  generateResultExplanation,
  type ExplanationInput,
} from "@/lib/results/generate-explanation";

/* --------------------------------------------------------------------------
 * Helpers: build representative stored assessment data the way STEP 7 would
 * persist it (answers resolved to questionId/answerKey, scores normalized).
 * ------------------------------------------------------------------------ */

/**
 * This test drives `scoreAssessment`, so it needs the authoritative weighted
 * configuration (never the weight-free public view used by the UI). The
 * legacy question bank is used because it is what seeded the database.
 */
function getScoringQuestions(major: Major) {
  return getLegacyQuestionSet(major).questions;
}

type AnyQuestion = ReturnType<typeof getScoringQuestions>[number];

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

/** Answers that maximize the target concentration's raw score. */
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

/** Builds the ExplanationInput from a scored answer set. */
function storedInput(major: Major, answers: Record<string, string>): ExplanationInput {
  const scored = scoreAssessment({
    major,
    answers,
    questionSet: getLegacyQuestionSet(major),
  });
  return {
    major,
    recommendedConcentration: scored.recommendedConcentration,
    recommendedScore: scored.recommendedScore,
    confidenceLabel: scored.confidenceLabel,
    scores: scored.scores.map((score) => ({
      concentration: score.concentration,
      normalizedScore: score.normalizedScore,
    })),
    answers: scored.answers.map((answer) => ({
      questionId: answer.questionId,
      answerKey: answer.answerKey,
    })),
  };
}

/* --------------------------------------------------------------------------
 * Determinism (requirement 14, 57)
 * ------------------------------------------------------------------------ */

describe("generateResultExplanation — determinism", () => {
  it("produces identical output for identical stored input", () => {
    const input = storedInput(
      "INFORMATICS",
      strongestProfile("INFORMATICS", "AI"),
    );
    const first = generateResultExplanation(input);
    const second = generateResultExplanation(input);
    expect(second).toEqual(first);
  });
});

/* --------------------------------------------------------------------------
 * Informatics explanations
 * ------------------------------------------------------------------------ */

describe("generateResultExplanation — Informatics", () => {
  it("explains an AI recommendation with AI vocabulary", () => {
    const input = storedInput(
      "INFORMATICS",
      strongestProfile("INFORMATICS", "AI"),
    );
    expect(input.recommendedConcentration).toBe("AI");

    const explanation = generateResultExplanation(input);
    expect(explanation.summary).toContain("Artificial Intelligence (AI)");
    expect(explanation.summary).toContain("intelligent models");
    expect(explanation.summary).toContain("pattern recognition");

    expect(explanation.strengths.length).toBeGreaterThan(0);
    expect(explanation.strengths.length).toBeLessThanOrEqual(4);
    expect(explanation.strengths).toContain(
      "building intelligent models and experimenting with algorithms",
    );
  });

  it("never mentions unrelated concentration themes for an AI result", () => {
    const input = storedInput(
      "INFORMATICS",
      strongestProfile("INFORMATICS", "AI"),
    );
    const explanation = generateResultExplanation(input);

    expect(explanation.summary).not.toContain("Cyber Security");
    expect(explanation.summary).not.toContain("Game Development");
    expect(explanation.summary).not.toContain("Enterprise Resource Planning");
    expect(explanation.summary).not.toContain("business processes");
    expect(explanation.summary).not.toContain("DevOps");

    const joinedStrengths = explanation.strengths.join(" ");
    expect(joinedStrengths).not.toContain("business processes");
    expect(joinedStrengths).not.toContain("enterprise");
    expect(joinedStrengths).not.toContain("game mechanics");
  });
});

/* --------------------------------------------------------------------------
 * AI vs AI Healthcare (requirement 46, 59)
 * ------------------------------------------------------------------------ */

describe("generateResultExplanation — AI vs AI Healthcare", () => {
  it("keeps AI Healthcare medical and distinct from general AI", () => {
    const input = storedInput(
      "INFORMATICS",
      strongestProfile("INFORMATICS", "AI_HEALTHCARE"),
    );
    expect(input.recommendedConcentration).toBe("AI_HEALTHCARE");

    const explanation = generateResultExplanation(input);
    expect(explanation.summary).toContain(
      "Artificial Intelligence (AI) in Healthcare",
    );
    expect(explanation.summary.toLowerCase()).toContain("healthcare");
    expect(explanation.summary.toLowerCase()).toContain("patient monitoring");

    // Must not read exactly like the general-AI explanation.
    const aiInput = storedInput(
      "INFORMATICS",
      strongestProfile("INFORMATICS", "AI"),
    );
    const aiExplanation = generateResultExplanation(aiInput);
    expect(explanation.summary).not.toBe(aiExplanation.summary);
    expect(aiExplanation.summary).not.toContain("patient monitoring");
  });
});

/* --------------------------------------------------------------------------
 * VR / wearable context (requirements 45, 58)
 * ------------------------------------------------------------------------ */

describe("generateResultExplanation — VR and wearable signals", () => {
  it("mentions immersive VR/3D work when a Game Development result has VR answers", () => {
    const base = strongestProfile("INFORMATICS", "GAME_DEVELOPMENT");
    // Explicitly select VR-related options.
    const answers = withOverrides(base, {
      INF_Q15: "INF_Q15_C", // VR level moving through a 3D space
      INF_Q17: "INF_Q17_A", // Creating the VR world and 3D equipment models
    });
    const input = storedInput("INFORMATICS", answers);
    expect(input.recommendedConcentration).toBe("GAME_DEVELOPMENT");

    const explanation = generateResultExplanation(input);
    expect(explanation.strengths).toContain("immersive VR and 3D environments");
    expect(explanation.summary).toContain("Game Development");
  });

  it("mentions connected devices/sensors when an IoT result has wearable answers", () => {
    const base = strongestProfile("INFORMATICS", "IOT");
    // The IOT-maximizing profile already picks the motion-sensor/wearable
    // option on INF_Q17; reinforce it on the wearable health device question.
    const answers = withOverrides(base, {
      INF_Q10: "INF_Q10_A", // wearable device collecting health signals
      INF_Q17: "INF_Q17_B", // motion sensors and haptic wearable devices
      INF_Q18: "INF_Q18_E", // wearable safety device
    });
    const input = storedInput("INFORMATICS", answers);
    expect(input.recommendedConcentration).toBe("IOT");

    const explanation = generateResultExplanation(input);
    expect(explanation.strengths).toContain(
      "motion tracking, wearable sensors, and connected devices",
    );
  });

  it("does not mention VR for a Game Development result without VR answers", () => {
    // A Game Development profile choosing the non-VR creative options.
    const answers = allAnswers("INFORMATICS", (question) => {
      if (question.id === "INF_Q15") return "INF_Q15_A"; // physics puzzle (no VR)
      if (question.id === "INF_Q17") return "INF_Q17_E"; // deployments (no VR)
      return question.options[0].id;
    });
    const input = storedInput("INFORMATICS", answers);
    const explanation = generateResultExplanation(input);
    const joined = [...explanation.strengths, explanation.summary].join(" ");
    expect(joined.toLowerCase()).not.toContain("vr");
  });
});

/* --------------------------------------------------------------------------
 * Information Systems (requirements 47, 56)
 * ------------------------------------------------------------------------ */

describe("generateResultExplanation — Information Systems", () => {
  it("explains a Data Science recommendation distinctly from ERP", () => {
    const input = storedInput(
      "INFORMATION_SYSTEMS",
      strongestProfile("INFORMATION_SYSTEMS", "DATA_SCIENCE"),
    );
    expect(input.recommendedConcentration).toBe("DATA_SCIENCE");

    const explanation = generateResultExplanation(input);
    expect(explanation.summary).toContain("Data Science");
    expect(explanation.summary).toContain("data analysis");
    expect(explanation.summary).not.toContain("business processes");
    expect(explanation.summary).not.toContain("Enterprise Resource Planning");
    expect(explanation.strengths).toContain("analyzing business data and finding patterns");
  });

  it("explains an ERP recommendation distinctly from Data Science", () => {
    const input = storedInput(
      "INFORMATION_SYSTEMS",
      strongestProfile("INFORMATION_SYSTEMS", "ERP"),
    );
    expect(input.recommendedConcentration).toBe("ERP");

    const explanation = generateResultExplanation(input);
    expect(explanation.summary).toContain("Intelligent Enterprise Systems");
    expect(explanation.summary).toContain("business processes");
    expect(explanation.summary).not.toContain("data analysis");
    expect(explanation.summary).not.toContain("visualization");
    expect(explanation.strengths).toContain("understanding and improving business processes");
  });
});


/* --------------------------------------------------------------------------
 * Close match and secondary concentration (requirements 20, 21, 57)
 * ------------------------------------------------------------------------ */

describe("generateResultExplanation — close match and secondary note", () => {
  it("adds a close-match note and secondary context when the top two are close", () => {
    const input: ExplanationInput = {
      major: "INFORMATICS",
      recommendedConcentration: "AI",
      recommendedScore: 62,
      confidenceLabel: "Close Match",
      scores: [
        { concentration: "AI", normalizedScore: 62 },
        { concentration: "AI_HEALTHCARE", normalizedScore: 59 },
        { concentration: "CYBER_SECURITY", normalizedScore: 40 },
        { concentration: "IOT", normalizedScore: 33 },
        { concentration: "GAME_DEVELOPMENT", normalizedScore: 31 },
        { concentration: "DEVOPS", normalizedScore: 20 },
      ],
      answers: [
        { questionId: "INF_Q03", answerKey: "INF_Q03_E" },
        { questionId: "INF_Q08", answerKey: "INF_Q08_E" },
        { questionId: "INF_Q10", answerKey: "INF_Q10_B" },
        { questionId: "INF_Q13", answerKey: "INF_Q13_C" },
        { questionId: "INF_Q15", answerKey: "INF_Q15_B" },
      ],
    };

    const explanation = generateResultExplanation(input);
    expect(explanation.closeMatch).toBe(true);
    expect(explanation.closeMatchNote).toContain("quite close");
    expect(explanation.closeMatchNote).toContain("reviewing both concentration curricula");
    expect(explanation.secondaryNote).toContain(
      "Artificial Intelligence (AI) in Healthcare",
    );
  });

  it("shows a secondary note for a moderate gap but no close-match note", () => {
    const input: ExplanationInput = {
      major: "INFORMATICS",
      recommendedConcentration: "AI",
      recommendedScore: 80,
      confidenceLabel: "Moderate",
      scores: [
        { concentration: "AI", normalizedScore: 80 },
        { concentration: "AI_HEALTHCARE", normalizedScore: 70 },
        { concentration: "CYBER_SECURITY", normalizedScore: 40 },
        { concentration: "IOT", normalizedScore: 33 },
        { concentration: "GAME_DEVELOPMENT", normalizedScore: 31 },
        { concentration: "DEVOPS", normalizedScore: 20 },
      ],
      answers: [
        { questionId: "INF_Q03", answerKey: "INF_Q03_E" },
        { questionId: "INF_Q10", answerKey: "INF_Q10_B" },
        { questionId: "INF_Q13", answerKey: "INF_Q13_C" },
      ],
    };

    const explanation = generateResultExplanation(input);
    expect(explanation.closeMatch).toBe(false);
    expect(explanation.closeMatchNote).toBeUndefined();
    expect(explanation.secondaryNote).toBeDefined();
    expect(explanation.secondaryNote).toContain(
      "Artificial Intelligence (AI) in Healthcare",
    );
  });

  it("omits the secondary note when the winner has a commanding lead", () => {
    const input = storedInput(
      "INFORMATICS",
      strongestProfile("INFORMATICS", "AI"),
    );
    expect(input.confidenceLabel).toBe("High");
    const explanation = generateResultExplanation(input);
    expect(explanation.secondaryNote).toBeUndefined();
    expect(explanation.closeMatch).toBe(false);
  });
});

/* --------------------------------------------------------------------------
 * Balanced edge case (no positive support)
 * ------------------------------------------------------------------------ */

describe("generateResultExplanation — balanced result", () => {
  it("returns a neutral explanation when no concentration scored above zero (defensive)", () => {
    // With the current question configuration every concentration always
    // receives at least some weight, so this branch is defensive. It is
    // exercised directly to guarantee it never claims a fit it cannot support.
    const input: ExplanationInput = {
      major: "INFORMATICS",
      recommendedConcentration: "CYBER_SECURITY",
      recommendedScore: 0,
      confidenceLabel: "High",
      scores: [
        { concentration: "CYBER_SECURITY", normalizedScore: 0 },
        { concentration: "IOT", normalizedScore: 0 },
        { concentration: "AI", normalizedScore: 0 },
        { concentration: "AI_HEALTHCARE", normalizedScore: 0 },
        { concentration: "GAME_DEVELOPMENT", normalizedScore: 0 },
        { concentration: "DEVOPS", normalizedScore: 0 },
      ],
      answers: [{ questionId: "INF_Q01", answerKey: "INF_Q01_A" }],
    };

    const explanation = generateResultExplanation(input);
    expect(explanation.summary).toContain("evenly balanced");
    expect(explanation.strengths).toHaveLength(0);
    expect(explanation.closeMatch).toBe(false);
  });
});

