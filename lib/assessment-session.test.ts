import { describe, expect, it } from "vitest";
import { assessmentSessionSchema } from "@/lib/validation";

describe("assessment session schema", () => {
  it("fills in answers and currentQuestion defaults for legacy sessions", () => {
    const result = assessmentSessionSchema.safeParse({
      fullName: "Budi Santoso",
      major: "INFORMATICS",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.answers).toEqual({});
      expect(result.data.currentQuestion).toBe(0);
    }
  });

  it("parses a full session with answers", () => {
    const result = assessmentSessionSchema.safeParse({
      fullName: "Budi Santoso",
      major: "INFORMATICS",
      answers: { INF_Q01: "INF_Q01_C", INF_Q04: "INF_Q04_E" },
      currentQuestion: 7,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.answers.INF_Q01).toBe("INF_Q01_C");
      expect(result.data.currentQuestion).toBe(7);
    }
  });

  it("rejects an unknown major", () => {
    const result = assessmentSessionSchema.safeParse({
      fullName: "Budi Santoso",
      major: "MEDICINE",
    });

    expect(result.success).toBe(false);
  });

  it("accepts an out-of-range currentQuestion (flows clamp it on restore)", () => {
    const result = assessmentSessionSchema.safeParse({
      fullName: "Budi Santoso",
      major: "INFORMATICS",
      currentQuestion: 42,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentQuestion).toBe(42);
    }
  });

  it("rejects a negative currentQuestion", () => {
    const result = assessmentSessionSchema.safeParse({
      fullName: "Budi Santoso",
      major: "INFORMATICS",
      currentQuestion: -1,
    });

    expect(result.success).toBe(false);
  });

  it("rejects a non-integer currentQuestion", () => {
    const result = assessmentSessionSchema.safeParse({
      fullName: "Budi Santoso",
      major: "INFORMATICS",
      currentQuestion: 3.5,
    });

    expect(result.success).toBe(false);
  });
});
