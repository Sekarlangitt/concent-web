import { describe, expect, it } from "vitest";
import {
  informaticsQuestions,
  INFORMATICS_CONCENTRATIONS,
} from "@/data/informaticsQuestions";
import {
  getConcentrationCoverage,
  getMaxScoreByConcentration,
  getQuestionTypeCounts,
} from "@/lib/scoring-utils";

/**
 * STEP 4 development report: prints the maximum possible raw score per
 * concentration and question-type distribution so the questionnaire balance
 * can be reviewed at a glance during testing.
 */
describe("Informatics maximum score report", () => {
  it("prints the maximum possible raw score per concentration", () => {
    const maxima = getMaxScoreByConcentration();
    for (const concentration of INFORMATICS_CONCENTRATIONS) {
      console.log(`Maximum raw score — ${concentration}: ${maxima[concentration]}`);
    }
  });

  it("prints per-concentration question coverage", () => {
    const coverage = getConcentrationCoverage();
    for (const concentration of INFORMATICS_CONCENTRATIONS) {
      console.log(`Coverage — ${concentration}: ${coverage[concentration]} question(s)`);
    }
  });

  it("prints the question type distribution", () => {
    const counts = getQuestionTypeCounts();
    for (const [type, count] of Object.entries(counts)) {
      console.log(`Type ${type}: ${count}`);
    }
  });

  it("has exactly 20 questions", () => {
    expect(informaticsQuestions.length).toBe(20);
  });

  it("locks the expected maximum raw scores (documented balance)", () => {
    const maxima = getMaxScoreByConcentration();
    expect(maxima).toEqual({
      CYBER_SECURITY: 45,
      IOT: 49,
      AI: 46,
      AI_HEALTHCARE: 41,
      GAME_DEVELOPMENT: 44,
      DEVOPS: 42,
    });
  });
});
