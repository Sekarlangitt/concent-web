import { describe, expect, it } from "vitest";
import {
  informationSystemsQuestions,
  INFORMATION_SYSTEMS_CONCENTRATIONS,
} from "@/data/informationSystemsQuestions";
import {
  getInformationSystemsCoverage,
  getInformationSystemsMaxScores,
  getQuestionTypeCounts,
} from "@/lib/scoring-utils";

/**
 * STEP 5 development report: prints the maximum possible raw score per
 * Information Systems concentration, question coverage, and the question-type
 * distribution so the questionnaire balance can be reviewed at a glance.
 */
describe("Information Systems maximum score report", () => {
  it("prints the maximum possible raw score per concentration", () => {
    const maxima = getInformationSystemsMaxScores();
    for (const concentration of INFORMATION_SYSTEMS_CONCENTRATIONS) {
      console.log(`Maximum raw score — ${concentration}: ${maxima[concentration]}`);
    }
  });

  it("prints per-concentration question coverage", () => {
    const coverage = getInformationSystemsCoverage();
    for (const concentration of INFORMATION_SYSTEMS_CONCENTRATIONS) {
      console.log(`Coverage — ${concentration}: ${coverage[concentration]} question(s)`);
    }
  });

  it("prints the question type distribution", () => {
    const counts = getQuestionTypeCounts(informationSystemsQuestions);
    for (const [type, count] of Object.entries(counts)) {
      console.log(`Type ${type}: ${count}`);
    }
  });

  it("has exactly 20 questions", () => {
    expect(informationSystemsQuestions.length).toBe(20);
  });

  it("locks the expected maximum raw scores (documented balance)", () => {
    const maxima = getInformationSystemsMaxScores();
    expect(maxima).toEqual({
      DATA_SCIENCE: 75,
      ERP: 71,
    });
  });
});
