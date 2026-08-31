import { describe, expect, it } from "vitest";
import { informaticsQuestions } from "@/data/informaticsQuestions";
import { informationSystemsQuestions } from "@/data/informationSystemsQuestions";
import {
  informationSystemsPublicQuestions,
  informaticsPublicQuestions,
} from "@/data/publicQuestions";

/**
 * STEP 12 cross-major weight integrity (requirement 18/19).
 *
 * The final supported concentration set is fixed:
 *   INFORMATICS         → CYBER_SECURITY, IOT, AI, AI_HEALTHCARE,
 *                         GAME_DEVELOPMENT, DEVOPS (6)
 *   INFORMATION_SYSTEMS → DATA_SCIENCE, ERP (2)
 *
 * No other concentration may appear in the scoring weights, and the public
 * questionnaire totals 40 questions (20 per major).
 */
describe("weight parity — cross-major integrity", () => {
  it("totals 40 public questions (20 Informatics + 20 Information Systems)", () => {
    expect(informaticsPublicQuestions.length).toBe(20);
    expect(informationSystemsPublicQuestions.length).toBe(20);
    expect(informaticsQuestions.length).toBe(20);
    expect(informationSystemsQuestions.length).toBe(20);
    expect(informaticsQuestions.length + informationSystemsQuestions.length).toBe(
      40,
    );
  });

  it("server weight maps only contain their own major's concentrations", () => {
    const informaticsAllowed = new Set([
      "CYBER_SECURITY",
      "IOT",
      "AI",
      "AI_HEALTHCARE",
      "GAME_DEVELOPMENT",
      "DEVOPS",
    ]);
    const informationSystemsAllowed = new Set(["DATA_SCIENCE", "ERP"]);

    for (const question of informaticsQuestions) {
      for (const option of question.options) {
        for (const concentration of Object.keys(option.weights)) {
          expect(
            informaticsAllowed.has(concentration),
            `${option.id}: Informatics weight map must not contain ${concentration}`,
          ).toBe(true);
        }
      }
    }
    for (const question of informationSystemsQuestions) {
      for (const option of question.options) {
        for (const concentration of Object.keys(option.weights)) {
          expect(
            informationSystemsAllowed.has(concentration),
            `${option.id}: Information Systems weight map must not contain ${concentration}`,
          ).toBe(true);
        }
      }
    }
  });
});
