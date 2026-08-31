import { describe, expect, it } from "vitest";

import {
  getAnswerCompleteness,
  QUESTION_TYPE_LABELS,
  resolveAssessmentAnswers,
  resolveConcentrationScores,
  UNRESOLVED_ANSWER_LABEL,
} from "@/lib/admin/assessment-detail";
import type { StoredAnswerRow } from "@/lib/admin/assessment-detail";

/* --------------------------------------------------------------------------
 * resolveAssessmentAnswers — stored IDs → readable text (requirements 42–44,
 * 94). Answer labels resolve against the trusted question configuration in
 * original questionnaire order.
 * ------------------------------------------------------------------------ */

describe("resolveAssessmentAnswers (Informatics)", () => {
  const stored: StoredAnswerRow[] = Array.from({ length: 20 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return {
      questionId: `INF_Q${number}`,
      answerKey: `INF_Q${number}_D`,
      numericValue: index < 3 ? 4 : null,
    };
  });

  it("returns exactly 20 rows in questionnaire order", () => {
    const rows = resolveAssessmentAnswers("INFORMATICS", stored);
    expect(rows).toHaveLength(20);
    expect(rows[0].questionNumber).toBe(1);
    expect(rows[0].questionId).toBe("INF_Q01");
    expect(rows[19].questionNumber).toBe(20);
    expect(rows[19].questionId).toBe("INF_Q20");
  });

  it("resolves the stored answer key to the human-readable label", () => {
    const rows = resolveAssessmentAnswers("INFORMATICS", stored);
    expect(rows[0]).toMatchObject({
      questionId: "INF_Q01",
      questionNumber: 1,
      answerKey: "INF_Q01_D",
      answerLabel: "Interested",
      resolved: true,
      numericValue: 4,
    });
    expect(rows[0].questionText).toContain("computer systems are protected");
  });

  it("resolves every Informatics row successfully", () => {
    const rows = resolveAssessmentAnswers("INFORMATICS", stored);
    expect(rows.every((row) => row.resolved)).toBe(true);
    expect(rows.every((row) => row.answerLabel !== null)).toBe(true);
  });
});

describe("resolveAssessmentAnswers (Information Systems)", () => {
  const stored: StoredAnswerRow[] = Array.from({ length: 20 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return {
      questionId: `IS_Q${number}`,
      answerKey: `IS_Q${number}_A`,
      numericValue: null,
    };
  });

  it("returns exactly 20 rows for IS questions only", () => {
    const rows = resolveAssessmentAnswers("INFORMATION_SYSTEMS", stored);
    expect(rows).toHaveLength(20);
    expect(rows[0].questionId).toBe("IS_Q01");
    expect(rows.every((row) => row.questionId.startsWith("IS_Q"))).toBe(true);
  });

  it("resolves IS labels", () => {
    const rows = resolveAssessmentAnswers("INFORMATION_SYSTEMS", stored);
    expect(rows[0].answerLabel).toBe("Not interested at all");
    expect(rows[0].resolved).toBe(true);
  });
});

describe("resolveAssessmentAnswers (missing/invalid data)", () => {
  it("marks a missing answer as unresolved without crashing", () => {
    const stored: StoredAnswerRow[] = [
      { questionId: "INF_Q01", answerKey: "INF_Q01_D", numericValue: 4 },
    ];
    const rows = resolveAssessmentAnswers("INFORMATICS", stored);
    expect(rows).toHaveLength(20);
    const missing = rows[1];
    expect(missing).toMatchObject({
      questionId: "INF_Q02",
      questionNumber: 2,
      answerKey: null,
      answerLabel: null,
      resolved: false,
    });
  });

  it("marks an invalid option id as unresolved (no crash)", () => {
    const stored: StoredAnswerRow[] = [
      { questionId: "INF_Q01", answerKey: "INF_Q01_Z", numericValue: null },
    ];
    const rows = resolveAssessmentAnswers("INFORMATICS", stored);
    expect(rows[0]).toMatchObject({
      questionId: "INF_Q01",
      answerKey: "INF_Q01_Z",
      answerLabel: null,
      resolved: false,
    });
  });

  it("appends orphan rows for stored answers with unknown question ids", () => {
    const stored: StoredAnswerRow[] = [
      { questionId: "INF_Q01", answerKey: "INF_Q01_D", numericValue: 4 },
      { questionId: "IS_Q99", answerKey: "SOME_KEY", numericValue: null },
    ];
    const rows = resolveAssessmentAnswers("INFORMATICS", stored);
    expect(rows).toHaveLength(21);
    const orphan = rows[rows.length - 1];
    expect(orphan).toMatchObject({
      questionId: "IS_Q99",
      questionNumber: null,
      questionType: null,
      questionText: null,
      answerLabel: null,
      resolved: false,
    });
  });
});

/* --------------------------------------------------------------------------
 * getAnswerCompleteness — 20-answer completeness check (requirement 45).
 * ------------------------------------------------------------------------ */

describe("getAnswerCompleteness", () => {
  it("accepts exactly 20 stored answers", () => {
    const result = getAnswerCompleteness("INFORMATICS", 20);
    expect(result).toEqual({ expected: 20, actual: 20, complete: true });
  });

  it("flags any other count as incomplete", () => {
    expect(getAnswerCompleteness("INFORMATION_SYSTEMS", 19)).toMatchObject({
      expected: 20,
      actual: 19,
      complete: false,
    });
    expect(getAnswerCompleteness("INFORMATICS", 21)).toMatchObject({
      complete: false,
    });
  });
});


/* --------------------------------------------------------------------------
 * resolveConcentrationScores — per-major score rows (requirements 39–40,
 * 101–102). Sorted by normalizedScore descending, cross-major rows dropped,
 * the stored recommendation marked.
 * ------------------------------------------------------------------------ */

describe("resolveConcentrationScores", () => {
  const allScores = [
    { concentration: "CYBER_SECURITY", rawScore: 20, normalizedScore: 30 },
    { concentration: "IOT", rawScore: 30, normalizedScore: 40 },
    { concentration: "AI", rawScore: 60, normalizedScore: 90 },
    { concentration: "AI_HEALTHCARE", rawScore: 50, normalizedScore: 70 },
    { concentration: "GAME_DEVELOPMENT", rawScore: 40, normalizedScore: 60 },
    { concentration: "DEVOPS", rawScore: 10, normalizedScore: 20 },
    { concentration: "DATA_SCIENCE", rawScore: 80, normalizedScore: 95 },
    { concentration: "ERP", rawScore: 5, normalizedScore: 10 },
  ] as const;

  it("returns 6 Informatics scores sorted by normalized score desc", () => {
    const scores = resolveConcentrationScores("INFORMATICS", "AI", allScores);
    expect(scores).toHaveLength(6);
    expect(scores.map((score) => score.concentration)).toEqual([
      "AI",
      "AI_HEALTHCARE",
      "GAME_DEVELOPMENT",
      "IOT",
      "CYBER_SECURITY",
      "DEVOPS",
    ]);
  });

  it("marks the recommended concentration", () => {
    const scores = resolveConcentrationScores("INFORMATICS", "AI", allScores);
    expect(scores[0].recommended).toBe(true);
    expect(scores.filter((score) => score.recommended)).toHaveLength(1);
  });

  it("returns 2 Information Systems scores and drops cross-major rows", () => {
    const scores = resolveConcentrationScores(
      "INFORMATION_SYSTEMS",
      "DATA_SCIENCE",
      allScores,
    );
    expect(scores.map((score) => score.concentration)).toEqual([
      "DATA_SCIENCE",
      "ERP",
    ]);
    expect(scores[0].recommended).toBe(true);
  });

  it("preserves raw score alongside the normalized score", () => {
    const scores = resolveConcentrationScores("INFORMATICS", "AI", allScores);
    expect(scores[0]).toMatchObject({ rawScore: 60, normalizedScore: 90 });
  });
});

/* --------------------------------------------------------------------------
 * QUESTION_TYPE_LABELS / UNRESOLVED_ANSWER_LABEL — display copy.
 * ------------------------------------------------------------------------ */

describe("display labels", () => {
  it("maps every question type to a readable label", () => {
    expect(QUESTION_TYPE_LABELS.LIKERT).toBe("Likert scale");
    expect(QUESTION_TYPE_LABELS.MULTIPLE_CHOICE).toBe("Multiple choice");
    expect(QUESTION_TYPE_LABELS.SCENARIO).toBe("Scenario");
  });

  it("exposes the unresolved-answer copy used by the detail page", () => {
    expect(UNRESOLVED_ANSWER_LABEL).toBe("Unable to resolve stored answer");
  });
});
