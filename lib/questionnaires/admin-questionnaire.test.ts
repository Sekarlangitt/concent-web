import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  QuestionnaireAdminError,
  createDraftFromPublished,
  publishDraftVersion,
  updateQuestionInDraft,
} from "@/lib/questionnaires/admin-questionnaire";
import { getPublishedVersionForMajor } from "@/lib/questionnaires/student-questionnaire";
import type { Major } from "@/lib/major";

/**
 * Service-level tests with an in-memory Prisma fake.
 *
 * These verify the questionnaire domain rules that cannot be expressed as
 * pure functions: draft cloning from the published version, atomic publish
 * (archive previous → publish new), DRAFT-only editing, and version switching
 * (an archived version stays queryable for in-flight students).
 */

const mock = vi.hoisted(() => {
  type Weight = { id: string; questionOptionId: string; concentration: string; weight: number };
  type Option = { id: string; questionId: string; order: number; label: string; numericValue: number | null };
  type Question = {
    id: string;
    questionnaireVersionId: string;
    order: number;
    type: string;
    text: string;
    helpText: string | null;
    category: string | null;
    isRequired: boolean;
  };
  type Version = {
    id: string;
    major: Major;
    versionNumber: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    publishedAt: Date | null;
  };

  let versions: Version[] = [];
  let questions: Question[] = [];
  let options: Option[] = [];
  let weights: Weight[] = [];
  let nextId = 1;

  function id(prefix: string): string {
    nextId += 1;
    return `${prefix}-${nextId}`;
  }

  function cloneVersionRecord(version: Version) {
    return {
      ...version,
      questions: questions
        .filter((q) => q.questionnaireVersionId === version.id)
        .sort((a, b) => a.order - b.order)
        .map((q) => ({
          ...q,
          options: options
            .filter((o) => o.questionId === q.id)
            .sort((a, b) => a.order - b.order)
            .map((o) => ({
              ...o,
              weights: weights.filter((w) => w.questionOptionId === o.id),
            })),
        })),
    };
  }

  function findVersionWithRelations(versionId: string) {
    const version = versions.find((v) => v.id === versionId);
    return version ? cloneVersionRecord(version) : null;
  }

  function makeVersion(major: Major, versionNumber: number, status: string): Version {
    const version: Version = {
      id: `version-${major}-${versionNumber}`,
      major,
      versionNumber,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    };
    versions.push(version);
    return version;
  }

  function addQuestion(versionId: string, order: number, concentration: string): void {
    const question: Question = {
      id: id("q"),
      questionnaireVersionId: versionId,
      order,
      type: "LIKERT",
      text: `Question ${order}`,
      helpText: null,
      category: null,
      isRequired: true,
    };
    questions.push(question);
    const option: Option = {
      id: id("opt"),
      questionId: question.id,
      order: 1,
      label: "Yes",
      numericValue: 1,
    };
    options.push(option);
    weights.push({
      id: id("w"),
      questionOptionId: option.id,
      concentration,
      weight: 5,
    });
    const noOption: Option = {
      id: id("opt"),
      questionId: question.id,
      order: 2,
      label: "No",
      numericValue: 2,
    };
    options.push(noOption);
    weights.push({
      id: id("w"),
      questionOptionId: noOption.id,
      concentration,
      weight: 0,
    });
  }

  const tx = {
    questionnaireVersion: {
      findFirst: async (args: {
        where: Record<string, unknown>;
        select?: unknown;
        include?: unknown;
        orderBy?: unknown;
      }) => {
        const entries = versions.filter((v) =>
          Object.entries(args.where).every(([key, value]) => {
            if (key === "major") return v.major === value;
            if (key === "status") return v.status === value;
            return true;
          }),
        );
        const match = entries.sort((a, b) => b.versionNumber - a.versionNumber)[0];
        return match
          ? args.include
            ? cloneVersionRecord(match)
            : match
          : null;
      },
      findUnique: async (args: { where: { id: string }; include?: unknown }) =>
        findVersionWithRelations(args.where.id),
      findMany: async () => versions,
      create: async (args: { data: Record<string, unknown>; select?: unknown }) => {
        const version = args.data as unknown as Version;
        version.id = version.id ?? id("version");
        versions.push(version);
        return args.select ? { id: version.id } : version;
      },
      update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        const version = versions.find((v) => v.id === args.where.id)!;
        Object.assign(version, args.data);
        return version;
      },
      updateMany: async (args: {
        where: { major?: Major; status?: string };
        data: Record<string, unknown>;
      }) => {
        for (const version of versions) {
          if (
            (!args.where.major || version.major === args.where.major) &&
            (!args.where.status || version.status === args.where.status)
          ) {
            Object.assign(version, args.data);
          }
        }
      },
      delete: async (args: { where: { id: string } }) => {
        versions = versions.filter((v) => v.id !== args.where.id);
      },
    },
    question: {
      findUnique: async (args: { where: { id: string }; select?: unknown }) =>
        questions.find((q) => q.id === args.where.id) ?? null,
      findMany: async () => questions,
      create: async (args: { data: Record<string, unknown>; select?: unknown }) => {
        const question = args.data as unknown as Question;
        question.id = question.id ?? id("q");
        questions.push(question);
        return { id: question.id };
      },
      update: async () => null,
      delete: async () => null,
    },
    questionOption: {
      findUnique: async () => null,
      findMany: async () => [],
      create: async (args: { data: Record<string, unknown>; select?: unknown }) => {
        const option = args.data as unknown as Option;
        option.id = option.id ?? id("opt");
        options.push(option);
        return { id: option.id };
      },
      update: async () => null,
      delete: async () => null,
      aggregate: async () => ({ _max: { order: null } }),
    },
    questionOptionWeight: {
      findMany: async () => [],
      create: async (args: { data: Record<string, unknown> }) => {
        const weight = args.data as unknown as Weight;
        weight.id = weight.id ?? id("w");
        weights.push(weight);
        return null;
      },
      update: async () => null,
      delete: async () => null,
    },
  };

  const prismaMock = {
    $transaction: async (
      callback: (transaction: typeof tx) => unknown,
    ) => callback(tx),
    questionnaireVersion: tx.questionnaireVersion,
    question: tx.question,
    questionOption: tx.questionOption,
    questionOptionWeight: tx.questionOptionWeight,
  };

  function reset(): void {
    versions = [];
    questions = [];
    options = [];
    weights = [];
    nextId = 100;

    // Seed Informatics V1 published with 20 questions covering all six
    // Informatics concentrations so the draft passes publish validation.
    const concentrations = [
      "CYBER_SECURITY",
      "IOT",
      "AI",
      "AI_HEALTHCARE",
      "GAME_DEVELOPMENT",
      "DEVOPS",
    ];
    const v1 = makeVersion("INFORMATICS", 1, "PUBLISHED");
    for (let order = 1; order <= 20; order += 1) {
      addQuestion(v1.id, order, concentrations[(order - 1) % concentrations.length]);
    }
  }

  return {
    prismaMock,
    reset,
    findVersionWithRelations,
    state: () => ({ versions, questions, options, weights }),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mock.prismaMock }));

beforeEach(() => {
  mock.reset();
});


describe("createDraftFromPublished", () => {
  it("clones the published version into a new DRAFT with the next version number", async () => {
    const draftId = await createDraftFromPublished("INFORMATICS");
    const draft = mock.findVersionWithRelations(draftId)!;

    expect(draft.versionNumber).toBe(2);
    expect(draft.status).toBe("DRAFT");
    expect(draft.questions).toHaveLength(20);
    expect(draft.questions[0].options[0].weights).toHaveLength(1);
    expect(draft.questions[0].options[0].weights[0].weight).toBe(5);
    // The published version is untouched.
    expect(mock.state().versions.find((v) => v.versionNumber === 1)?.status).toBe(
      "PUBLISHED",
    );
  });

  it("returns the existing draft instead of creating a second one", async () => {
    const first = await createDraftFromPublished("INFORMATICS");
    const second = await createDraftFromPublished("INFORMATICS");
    expect(second).toBe(first);
    expect(mock.state().versions.filter((v) => v.status === "DRAFT")).toHaveLength(1);
  });
});

describe("publishDraftVersion", () => {
  it("archives the previous published version and publishes the draft", async () => {
    const draftId = await createDraftFromPublished("INFORMATICS");
    await publishDraftVersion(draftId);

    const v1 = mock.state().versions.find((v) => v.versionNumber === 1)!;
    const v2 = mock.state().versions.find((v) => v.versionNumber === 2)!;
    expect(v1.status).toBe("ARCHIVED");
    expect(v2.status).toBe("PUBLISHED");
    expect(v2.publishedAt).not.toBeNull();
  });

  it("rejects publishing a version that is not a draft", async () => {
    await expect(publishDraftVersion("version-INFORMATICS-1")).rejects.toThrow(
      QuestionnaireAdminError,
    );
  });
});

describe("published immutability", () => {
  it("rejects editing a question inside a PUBLISHED version", async () => {
    const questionId = mock.state().questions[0].id;
    await expect(
      updateQuestionInDraft(questionId, {
        type: "LIKERT",
        text: "hacked",
        helpText: null,
      }),
    ).rejects.toThrow(/Only draft questionnaires can be edited/);
  });
});

describe("version switch (requirement 88)", () => {
  it("a student locked to V1 can still resolve it after V2 is published", async () => {
    const v1Id = mock.state().versions.find((v) => v.versionNumber === 1)!.id;
    const publishedBefore = await getPublishedVersionForMajor("INFORMATICS");
    expect(publishedBefore?.id).toBe(v1Id);

    const draftId = await createDraftFromPublished("INFORMATICS");
    await publishDraftVersion(draftId);

    // New students get V2.
    const publishedAfter = await getPublishedVersionForMajor("INFORMATICS");
    expect(publishedAfter?.versionNumber).toBe(2);

    // The archived V1 remains queryable for the in-flight student.
    const archivedV1 = mock.findVersionWithRelations(v1Id);
    expect(archivedV1?.status).toBe("ARCHIVED");
    expect(archivedV1?.questions).toHaveLength(20);
  });
});

