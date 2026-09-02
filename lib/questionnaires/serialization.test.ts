import { describe, expect, it } from "vitest";

import { serializeStudentQuestions } from "@/lib/questionnaires/serialization";

/**
 * Weight security (requirement 25/90): the student-safe serialization must
 * contain question/option metadata only — never QuestionOptionWeight rows,
 * weights, or any scoring configuration.
 */
describe("serializeStudentQuestions (weight security)", () => {
  const version = {
    questions: [
      {
        id: "q1",
        order: 1,
        type: "LIKERT" as const,
        text: "Pattern question",
        helpText: null,
        category: "machine-learning",
        options: [
          { id: "q1a", order: 1, label: "Agree", numericValue: 4, weights: { AI: 4 } },
          { id: "q1b", order: 2, label: "Disagree", numericValue: 2, weights: { AI: 1 } },
        ],
      },
      {
        id: "q2",
        order: 2,
        type: "SCENARIO" as const,
        text: "Hospital project",
        helpText: "Pick one.",
        category: "healthcare",
        options: [
          { id: "q2a", order: 1, label: "Wristband", weights: { IOT: 5 } },
        ],
      },
    ],
  };

  it("sorts by order and keeps only ids/text/type/category/helpText and option ids/labels", () => {
    const serialized = serializeStudentQuestions(version as never);

    expect(serialized.map((q) => q.id)).toEqual(["q1", "q2"]);
    expect(serialized[0].text).toBe("Pattern question");
    expect(serialized[1].helpText).toBe("Pick one.");
    expect(serialized[0].options.map((o) => o.label)).toEqual(["Agree", "Disagree"]);
  });

  it("never exposes weights anywhere in the serialization", () => {
    const serialized = serializeStudentQuestions(version as never);
    for (const question of serialized) {
      expect(
        (question as { weights?: unknown }).weights,
        `question ${question.id} leaked weights`,
      ).toBeUndefined();
      for (const option of question.options) {
        expect(
          (option as { weights?: unknown; numericValue?: unknown }).weights,
          `option ${option.id} leaked weights`,
        ).toBeUndefined();
        expect(
          (option as { weights?: unknown; numericValue?: unknown }).numericValue,
          `option ${option.id} leaked numericValue`,
        ).toBeUndefined();
      }
    }
    expect(JSON.stringify(serialized)).not.toContain("weight");
    expect(JSON.stringify(serialized)).not.toContain("IOT");
    expect(JSON.stringify(serialized)).not.toContain("AI");
  });
});
