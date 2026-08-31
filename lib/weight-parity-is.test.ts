import { describe, expect, it } from "vitest";
import { informationSystemsQuestions } from "@/data/informationSystemsQuestions";
import { informationSystemsPublicQuestions } from "@/data/publicQuestions";
import { getInformationSystemsScoringConfig } from "@/lib/scoring/server/informationSystemsWeights";

/**
 * STEP 12 client/server weight parity — Information Systems (requirement 18).
 *
 * The public view (data/publicQuestions.ts) is weight-free and client-safe;
 * the authoritative view (data/informationSystemsQuestions.ts +
 * lib/scoring/server/informationSystemsWeights.ts) is server-only and carries
 * the scoring weights. These tests guarantee the two views never drift.
 */

function compareSetMembership(
  label: string,
  publicIds: readonly string[],
  serverIds: readonly string[],
): void {
  const publicSet = new Set(publicIds);
  const serverSet = new Set(serverIds);

  const missingOnServer = publicIds.filter((id) => !serverSet.has(id));
  expect(
    missingOnServer,
    `${label}: public IDs missing from the server configuration: ${missingOnServer.join(", ")}`,
  ).toEqual([]);

  const extraOnServer = serverIds.filter((id) => !publicSet.has(id));
  expect(
    extraOnServer,
    `${label}: server-only IDs not present in the public view: ${extraOnServer.join(", ")}`,
  ).toEqual([]);
}

describe("weight parity — Information Systems (public ↔ authoritative)", () => {
  const publicQuestions = informationSystemsPublicQuestions;
  const serverQuestions = informationSystemsQuestions;
  const serverConfig = getInformationSystemsScoringConfig();
  const weightMap = new Map(
    serverConfig.questions.map((question) => [
      question.id,
      new Map(question.options.map((option) => [option.id, option.weights])),
    ]),
  );

  it("has exactly 20 public questions and 20 server questions", () => {
    expect(publicQuestions.length).toBe(20);
    expect(serverQuestions.length).toBe(20);
  });

  it("every public question exists in the server configuration (and vice versa)", () => {
    compareSetMembership(
      "IS questions",
      publicQuestions.map((q) => q.id),
      serverQuestions.map((q) => q.id),
    );
  });

  it("every public option ID exists in the server weight map (and vice versa)", () => {
    const publicOptionIds = publicQuestions.flatMap((q) =>
      q.options.map((o) => `${q.id}::${o.id}`),
    );
    const serverOptionIds = serverQuestions.flatMap((q) =>
      q.options.map((o) => `${q.id}::${o.id}`),
    );
    compareSetMembership("IS options", publicOptionIds, serverOptionIds);
  });

  it("every server option has a weight-map entry (no option scores as absent)", () => {
    for (const question of serverQuestions) {
      const options = weightMap.get(question.id)!;
      for (const option of question.options) {
        expect(
          options.has(option.id),
          `${option.id} missing from the weight map`,
        ).toBe(true);
      }
    }
  });

  it("question text, type, category, and option labels match exactly", () => {
    const serverByQuestion = new Map(serverQuestions.map((q) => [q.id, q]));
    for (const publicQuestion of publicQuestions) {
      const serverQuestion = serverByQuestion.get(publicQuestion.id)!;
      expect(serverQuestion.text).toBe(publicQuestion.text);
      expect(serverQuestion.type).toBe(publicQuestion.type);
      expect(serverQuestion.category).toBe(publicQuestion.category);
      expect(serverQuestion.options.length).toBe(publicQuestion.options.length);
      serverQuestion.options.forEach((serverOption, index) => {
        const publicOption = publicQuestion.options[index];
        expect(serverOption.id).toBe(publicOption.id);
        expect(serverOption.label).toBe(publicOption.label);
      });
    }
  });

  it("the public view exposes no weights", () => {
    for (const question of publicQuestions) {
      expect(
        (question as { weights?: unknown }).weights,
        `question ${question.id} must not expose weights`,
      ).toBeUndefined();
      for (const option of question.options) {
        expect(
          (option as { weights?: unknown }).weights,
          `option ${option.id} must not expose weights`,
        ).toBeUndefined();
      }
    }
  });
});
