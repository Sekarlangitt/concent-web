import { describe, expect, it } from "vitest";
import { informaticsQuestions } from "@/data/informaticsQuestions";
import { informationSystemsQuestions } from "@/data/informationSystemsQuestions";
import type { Major } from "@/lib/major";
import {
  clampQuestionIndex,
  getAnsweredCount,
  getAnswerLabel,
  getEditIndexFromParam,
  getFirstIncompleteIndex,
  getIncompleteQuestions,
  getQuestionsForMajor,
  getValidAnswersForMajor,
  isOptionIdForQuestion,
  isQuestionAnswered,
} from "@/lib/questionnaire";

describe("major-based question selection", () => {
  it("returns the 20 Informatics questions for INFORMATICS", () => {
    const questions = getQuestionsForMajor("INFORMATICS");
    expect(questions.length).toBe(20);
    for (const question of questions) {
      expect(question.major).toBe("INFORMATICS");
      expect(question.id).toMatch(/^INF_Q\d{2}$/);
    }
  });

  it("returns the 20 Information Systems questions for INFORMATION_SYSTEMS", () => {
    const questions = getQuestionsForMajor("INFORMATION_SYSTEMS");
    expect(questions.length).toBe(20);
    for (const question of questions) {
      expect(question.major).toBe("INFORMATION_SYSTEMS");
      expect(question.id).toMatch(/^IS_Q\d{2}$/);
    }
  });

  it("fails safely for an invalid major", () => {
    expect(getQuestionsForMajor("MEDICINE" as Major)).toEqual([]);
  });

  it("never mixes questions from both majors", () => {
    const informatics = getQuestionsForMajor("INFORMATICS");
    const informationSystems = getQuestionsForMajor("INFORMATION_SYSTEMS");

    expect(informatics.every((q) => q.id.startsWith("INF_Q"))).toBe(true);
    expect(informationSystems.every((q) => q.id.startsWith("IS_Q"))).toBe(true);
  });
});

describe("cross-major integrity", () => {
  it("contains exactly 40 questions across the application", () => {
    expect(informaticsQuestions.length).toBe(20);
    expect(informationSystemsQuestions.length).toBe(20);
    expect(informaticsQuestions.length + informationSystemsQuestions.length).toBe(
      40,
    );
  });

  it("does not collide on question IDs across majors", () => {
    const allIds = [
      ...informaticsQuestions.map((q) => q.id),
      ...informationSystemsQuestions.map((q) => q.id),
    ];
    expect(allIds.length).toBe(40);
    expect(new Set(allIds).size).toBe(40);
  });

  it("does not collide on option IDs across majors", () => {
    const allOptionIds = [
      ...informaticsQuestions.flatMap((q) => q.options.map((o) => o.id)),
      ...informationSystemsQuestions.flatMap((q) => q.options.map((o) => o.id)),
    ];
    expect(new Set(allOptionIds).size).toBe(allOptionIds.length);
  });
});

describe("completeness validation", () => {
  it("accepts a fully answered questionnaire", () => {
    const questions = getQuestionsForMajor("INFORMATION_SYSTEMS");
    const answers = Object.fromEntries(
      questions.map((question) => [
        question.id,
        question.options[0].id,
      ]),
    );
    expect(getIncompleteQuestions(questions, answers)).toEqual([]);
  });

  it("flags questions with no answer", () => {
    const questions = getQuestionsForMajor("INFORMATION_SYSTEMS");
    const answers: Record<string, string> = {
      IS_Q01: "IS_Q01_B",
      IS_Q02: "IS_Q02_A",
    };
    const incomplete = getIncompleteQuestions(questions, answers);
    expect(incomplete.length).toBe(18);
    expect(incomplete.map((q) => q.id)).not.toContain("IS_Q01");
    expect(incomplete.map((q) => q.id)).not.toContain("IS_Q02");
  });

  it("flags an answer whose value is not a valid option ID", () => {
    const questions = getQuestionsForMajor("INFORMATION_SYSTEMS");
    const answers = Object.fromEntries(
      questions.map((question) => [question.id, question.options[0].id]),
    );
    // Corrupt one answer with an option ID that does not belong to it.
    answers.IS_Q03 = "IS_Q05_D";
    const incomplete = getIncompleteQuestions(questions, answers);
    expect(incomplete.map((q) => q.id)).toEqual(["IS_Q03"]);
  });

  it("ignores cross-major answer IDs (IS session must not read INF answers)", () => {
    const questions = getQuestionsForMajor("INFORMATION_SYSTEMS");
    const answers = Object.fromEntries(
      questions.map((question) => [question.id, question.options[0].id]),
    );
    // An Informatics answer left over from a previous assessment.
    answers.INF_Q01 = "INF_Q01_B";
    expect(getIncompleteQuestions(questions, answers)).toEqual([]);
  });
});

describe("answer sanitization (invalid and cross-major answers)", () => {
  it("keeps only answers whose option ID belongs to the question", () => {
    const questions = getQuestionsForMajor("INFORMATION_SYSTEMS");
    const answers: Record<string, string> = {
      IS_Q01: "IS_Q01_C",
      IS_Q02: "NOT_A_REAL_OPTION",
    };
    expect(getValidAnswersForMajor(questions, answers)).toEqual({
      IS_Q01: "IS_Q01_C",
    });
  });

  it("drops answers keyed by questions outside the current major", () => {
    const questions = getQuestionsForMajor("INFORMATION_SYSTEMS");
    const answers: Record<string, string> = {
      INF_Q01: "INF_Q01_B",
      IS_Q03: "IS_Q03_D",
    };
    expect(getValidAnswersForMajor(questions, answers)).toEqual({
      IS_Q03: "IS_Q03_D",
    });
  });

  it("drops answers for unknown question IDs", () => {
    const questions = getQuestionsForMajor("INFORMATICS");
    const answers: Record<string, string> = {
      INF_Q99: "INF_Q99_A",
      INF_Q01: "INF_Q01_A",
    };
    expect(getValidAnswersForMajor(questions, answers)).toEqual({
      INF_Q01: "INF_Q01_A",
    });
  });

  it("returns an empty object when nothing is valid", () => {
    const questions = getQuestionsForMajor("INFORMATICS");
    expect(
      getValidAnswersForMajor(questions, { INF_Q01: "IS_Q01_A" }),
    ).toEqual({});
  });

  it("keeps a fully valid answer set unchanged", () => {
    const questions = getQuestionsForMajor("INFORMATICS");
    const answers = Object.fromEntries(
      questions.map((question) => [question.id, question.options[0].id]),
    );
    expect(getValidAnswersForMajor(questions, answers)).toEqual(answers);
  });

  it("recognizes a real option ID and rejects invented ones", () => {
    const question = informaticsQuestions[0];
    expect(isOptionIdForQuestion(question, question.options[0].id)).toBe(true);
    expect(isOptionIdForQuestion(question, "INF_Q20_E")).toBe(false);
    expect(isOptionIdForQuestion(question, "INVALID_OPTION")).toBe(false);
  });
});

describe("answered-count and first-incomplete helpers", () => {
  it("counts only valid answers (invalid and missing are not counted)", () => {
    const questions = getQuestionsForMajor("INFORMATION_SYSTEMS");
    const answers: Record<string, string> = {
      IS_Q01: "IS_Q01_C",
      IS_Q02: "IS_Q02_B",
      IS_Q03: "INVALID_OPTION",
      INF_Q01: "INF_Q01_B", // cross-major, must not count
    };
    expect(getAnsweredCount(questions, answers)).toBe(2);
  });

  it("reports the first incomplete index and -1 when complete", () => {
    const questions = getQuestionsForMajor("INFORMATICS");
    const answers = Object.fromEntries(
      questions.map((question) => [question.id, question.options[0].id]),
    );
    expect(getFirstIncompleteIndex(questions, answers)).toBe(-1);

    answers.INF_Q05 = "NOT_A_OPTION";
    expect(getFirstIncompleteIndex(questions, answers)).toBe(4);

    // Repair Q5, remove Q10 → first incomplete is now Q10 (index 9).
    answers.INF_Q05 = questions[4].options[0].id;
    delete answers.INF_Q10;
    expect(getFirstIncompleteIndex(questions, answers)).toBe(9);

    // A corrupted earlier question always wins.
    answers.INF_Q02 = "INVALID";
    expect(getFirstIncompleteIndex(questions, answers)).toBe(1);
  });

  it("finds the first incomplete question when the questionnaire is mostly empty", () => {
    const questions = getQuestionsForMajor("INFORMATION_SYSTEMS");
    const answers: Record<string, string> = {
      IS_Q04: "IS_Q04_B",
      IS_Q07: "IS_Q07_D",
    };
    expect(getFirstIncompleteIndex(questions, answers)).toBe(0);
  });
});

describe("edit-from-review query parameter parsing", () => {
  it("returns null when the parameter is missing", () => {
    expect(getEditIndexFromParam(null, 20)).toBeNull();
  });

  it("maps 1-based question numbers to zero-based indexes", () => {
    expect(getEditIndexFromParam("1", 20)).toBe(0);
    expect(getEditIndexFromParam("7", 20)).toBe(6);
    expect(getEditIndexFromParam("20", 20)).toBe(19);
  });

  it("rejects out-of-range, non-integer, and negative values", () => {
    expect(getEditIndexFromParam("0", 20)).toBeNull();
    expect(getEditIndexFromParam("21", 20)).toBeNull();
    expect(getEditIndexFromParam("-3", 20)).toBeNull();
    expect(getEditIndexFromParam("abc", 20)).toBeNull();
    expect(getEditIndexFromParam("7.5", 20)).toBeNull();
    expect(getEditIndexFromParam("", 20)).toBeNull();
  });

  it("bounds against the actual question set length", () => {
    expect(getEditIndexFromParam("20", 10)).toBeNull();
    expect(getEditIndexFromParam("10", 10)).toBe(9);
  });
});

describe("answer label resolution and advance rule", () => {
  it("resolves a stored option ID to its human-readable label", () => {
    const questions = getQuestionsForMajor("INFORMATION_SYSTEMS");
    const question = questions[0];
    const answers: Record<string, string> = {
      [question.id]: question.options[2].id,
    };
    expect(getAnswerLabel(question, answers)).toBe(question.options[2].label);
  });

  it("returns null when there is no stored answer", () => {
    const question = getQuestionsForMajor("INFORMATICS")[0];
    expect(getAnswerLabel(question, {})).toBeNull();
  });

  it("returns null for an invalid or cross-major option ID", () => {
    const questions = getQuestionsForMajor("INFORMATION_SYSTEMS");
    const question = questions[0];
    expect(
      getAnswerLabel(question, { [question.id]: "INVALID_OPTION" }),
    ).toBeNull();
    expect(
      getAnswerLabel(question, { [question.id]: "INF_Q01_A" }),
    ).toBeNull();
  });

  it("isQuestionAnswered mirrors the label resolution rule", () => {
    const questions = getQuestionsForMajor("INFORMATICS");
    const question = questions[3];
    expect(isQuestionAnswered(question, {})).toBe(false);
    expect(
      isQuestionAnswered(question, { [question.id]: "NOT_REAL" }),
    ).toBe(false);
    expect(
      isQuestionAnswered(question, { [question.id]: question.options[4].id }),
    ).toBe(true);
  });
});

describe("current-question index clamping", () => {
  it("keeps valid indexes unchanged", () => {
    expect(clampQuestionIndex(0, 20)).toBe(0);
    expect(clampQuestionIndex(7, 20)).toBe(7);
    expect(clampQuestionIndex(19, 20)).toBe(19);
  });

  it("clamps an out-of-range currentQuestion safely", () => {
    expect(clampQuestionIndex(-5, 20)).toBe(0);
    expect(clampQuestionIndex(42, 20)).toBe(19);
    expect(clampQuestionIndex(99, 20)).toBe(19);
  });

  it("floors fractional indexes and survives an empty question set", () => {
    expect(clampQuestionIndex(3.9, 20)).toBe(3);
    expect(clampQuestionIndex(0, 0)).toBe(0);
  });
});
