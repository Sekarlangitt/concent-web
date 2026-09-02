import { describe, expect, it } from "vitest";

import {
  buildAnswerSnapshots,
  scoreQuestionnaireVersion,
  toScoreQuestionSet,
} from "@/lib/questionnaires/scoring";
import type { QuestionnaireVersionShape } from "@/lib/questionnaires/types";

/** A tiny Informatics version with known weights for deterministic math. */
function fixtureVersion(): QuestionnaireVersionShape {
  return {
    id: "version-1",
    major: "INFORMATICS",
    versionNumber: 1,
    status: "PUBLISHED",
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
    questions: [
      {
        id: "q1",
        order: 1,
        type: "LIKERT",
        text: "Pattern question",
        helpText: null,
        category: "machine-learning",
        isRequired: true,
        options: [
          { id: "q1a", order: 1, label: "Strongly Disagree", numericValue: 1, weights: { AI: 0, DEVOPS: 0 } },
          { id: "q1b", order: 2, label: "Disagree", numericValue: 2, weights: { AI: 1, DEVOPS: 1 } },
          { id: "q1c", order: 3, label: "Neutral", numericValue: 3, weights: { AI: 2, DEVOPS: 2 } },
          { id: "q1d", order: 4, label: "Agree", numericValue: 4, weights: { AI: 4, DEVOPS: 3 } },
          { id: "q1e", order: 5, label: "Strongly Agree", numericValue: 5, weights: { AI: 5, DEVOPS: 4 } },
        ],
      },
      {
        id: "q2",
        order: 2,
        type: "SCENARIO",
        text: "Hospital project",
        helpText: "Pick one.",
        category: "healthcare",
        isRequired: true,
        options: [
          { id: "q2a", order: 1, label: "Predictive system", numericValue: null, weights: { AI: 4, AI_HEALTHCARE: 3 } },
          { id: "q2b", order: 2, label: "Wearable wristband", numericValue: null, weights: { IOT: 4 } },
          { id: "q2c", order: 3, label: "Security system", numericValue: null, weights: { CYBER_SECURITY: 4 } },
          { id: "q2d", order: 4, label: "3D training sim", numericValue: null, weights: { GAME_DEVELOPMENT: 4 } },
        ],
      },
    ],
  };
}

describe("toScoreQuestionSet", () => {
  it("sorts questions/options by order and resolves concentrations by major", () => {
    const set = toScoreQuestionSet(fixtureVersion());
    expect(set.questions.map((q) => q.id)).toEqual(["q1", "q2"]);
    expect(set.concentrations).toContain("CYBER_SECURITY");
    expect(set.concentrations).toContain("DEVOPS");
    expect(set.concentrations).not.toContain("ERP");
  });
});

describe("scoreQuestionnaireVersion (scoring from database weights)", () => {
  it("accumulates DB weights, normalizes by theoretical maxima, and recommends deterministically", () => {
    const answers = {
      q1: "q1e", // AI 5, DEVOPS 4
      q2: "q2a", // AI 4, AI_HEALTHCARE 3
    };
    const result = scoreQuestionnaireVersion({ version: fixtureVersion(), answers });

    const byName = new Map(
      result.scores.map((score) => [score.concentration, score]),
    );

    // Raw scores: AI = 5 + 4 = 9; AI_HEALTHCARE = 3.
    expect(byName.get("AI")?.rawScore).toBe(9);
    expect(byName.get("AI_HEALTHCARE")?.rawScore).toBe(3);

    // Theoretical maxima: AI = max(5,4) per question = 5 + 4 = 9 → 100%.
    expect(byName.get("AI")?.maxScore).toBe(9);
    expect(byName.get("AI")?.normalizedScore).toBe(100);

    expect(result.recommendedConcentration).toBe("AI");
    expect(result.answers).toHaveLength(2);
    expect(result.answers[0].numericValue).toBe(5);
    expect(result.answers[1].numericValue).toBeNull();
  });

  it("rejects an answer that is not an option of the version", () => {
    expect(() =>
      scoreQuestionnaireVersion({
        version: fixtureVersion(),
        answers: { q1: "q1e", q2: "NOT_AN_OPTION" },
      }),
    ).toThrow();
  });
});

describe("buildAnswerSnapshots", () => {
  it("stores the question text and option label used at submission time", () => {
    const version = fixtureVersion();
    const scored = scoreQuestionnaireVersion({
      version,
      answers: { q1: "q1c", q2: "q2b" },
    });
    const snapshots = buildAnswerSnapshots(version, scored);

    expect(snapshots).toHaveLength(2);
    const q1 = snapshots.find((snapshot) => snapshot.questionId === "q1");
    expect(q1?.questionSnapshot).toBe("Pattern question");
    expect(q1?.answerSnapshot).toBe("Neutral");
    expect(q1?.optionId).toBe("q1c");
    const q2 = snapshots.find((snapshot) => snapshot.questionId === "q2");
    expect(q2?.questionSnapshot).toBe("Hospital project");
    expect(q2?.answerSnapshot).toBe("Wearable wristband");
  });
});
