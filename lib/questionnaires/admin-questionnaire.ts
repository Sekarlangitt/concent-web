import "server-only";

import type { Concentration } from "@/data/concentrations";
import { CONCENTRATIONS_BY_MAJOR } from "@/data/concentrations";
import type { QuestionType } from "@/data/questionTypes";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { Major } from "@/lib/major";
import {
  VERSION_INCLUDE,
  mapVersionRecordToShape,
} from "@/lib/questionnaires/load-version";
import type {
  QuestionnaireVersionShape,
} from "@/lib/questionnaires/types";
import {
  MAX_WEIGHT,
  MIN_WEIGHT,
  validateQuestionnaireForPublish,
} from "@/lib/questionnaires/validation";

/**
 * Admin questionnaire data service (server-only).
 *
 * All mutations here assume the caller has already verified the admin session
 * (the server actions in lib/admin/questionnaire-actions.ts call requireAdmin()
 * first). The service enforces the questionnaire domain rules that do NOT
 * depend on authentication:
 *
 *  - PUBLISHED / ARCHIVED versions are immutable — only DRAFT versions can be
 *    edited, and every mutation re-verifies that server-side;
 *  - draft creation clones the current published version (or starts empty);
 *  - publishing is atomic and validates the whole version inside the same
 *    transaction;
 *  - weights are validated (0–5, major-compatible concentrations) on write.
 */

export type QuestionnaireAdminErrorCode =
  | "not-found"
  | "not-draft"
  | "validation"
  | "no-published-version"
  | "server";

export class QuestionnaireAdminError extends Error {
  readonly code: QuestionnaireAdminErrorCode;

  constructor(code: QuestionnaireAdminErrorCode, message: string) {
    super(message);
    this.name = "QuestionnaireAdminError";
    this.code = code;
  }
}

type Tx = Prisma.TransactionClient;

/**
 * Runs an interactive transaction with a generous timeout. The Supabase
 * transaction pooler is slower than a local database, and heavy operations
 * (cloning/publishing a 20-question questionnaire) easily exceed Prisma's
 * 5-second default interactive-transaction timeout.
 */
function runInTransaction<T>(callback: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(callback, { timeout: 60_000 });
}

/** The question/option/weight input accepted by question mutations. */
export type QuestionEditorInput = {
  type: QuestionType;
  text: string;
  helpText: string | null;
  options: Array<{
    id?: string;
    label: string;
    weights: Partial<Record<Concentration, number>>;
  }>;
};

/** Loads a version and verifies it is an editable DRAFT. */
async function findEditableDraft(
  tx: Tx,
  versionId: string,
): Promise<QuestionnaireVersionShape> {
  const record = await tx.questionnaireVersion.findUnique({
    where: { id: versionId },
    include: VERSION_INCLUDE,
  });
  if (!record) {
    throw new QuestionnaireAdminError("not-found", "Questionnaire version not found.");
  }
  if (record.status !== "DRAFT") {
    throw new QuestionnaireAdminError(
      "not-draft",
      "Only draft questionnaires can be edited. Published and archived versions are read-only.",
    );
  }
  return mapVersionRecordToShape(record);
}

function assertWeightsValid(
  major: Major,
  weights: Partial<Record<Concentration, number>>,
): void {
  const allowed = new Set<Concentration>(CONCENTRATIONS_BY_MAJOR[major]);
  for (const [rawConcentration, rawWeight] of Object.entries(weights)) {
    const concentration = rawConcentration as Concentration;
    const weight = Number(rawWeight);
    if (!allowed.has(concentration)) {
      throw new QuestionnaireAdminError(
        "validation",
        `"${concentration}" is not a valid concentration for ${major}.`,
      );
    }
    if (!Number.isInteger(weight) || weight < MIN_WEIGHT || weight > MAX_WEIGHT) {
      throw new QuestionnaireAdminError(
        "validation",
        `Weights must be whole numbers between ${MIN_WEIGHT} and ${MAX_WEIGHT}.`,
      );
    }
  }
}

/** Ordinal value for scaled types, or null for choice/scenario questions. */
function computeNumericValue(
  type: QuestionType,
  optionIndex: number,
): number | null {
  if (type === "LIKERT" || type === "AGREEMENT" || type === "PRIORITY") {
    return optionIndex + 1;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Read queries
// ---------------------------------------------------------------------------

/** All versions for a major (newest first) with question counts. */
export async function getVersionsForMajor(major: Major) {
  return prisma.questionnaireVersion.findMany({
    where: { major },
    orderBy: { versionNumber: "desc" },
    select: {
      id: true,
      major: true,
      versionNumber: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      _count: { select: { questions: true } },
    },
  });
}

/** Loads one version with all questions/options/weights, or null. */
export async function getVersionDetail(versionId: string) {
  const record = await prisma.questionnaireVersion.findUnique({
    where: { id: versionId },
    include: VERSION_INCLUDE,
  });
  return record ? mapVersionRecordToShape(record) : null;
}

/** Loads one question with its options and weights, or null. */
export async function getQuestionDetail(questionId: string) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      options: {
        orderBy: { order: "asc" },
        include: { weights: true },
      },
    },
  });
  if (!question) {
    return null;
  }
  const version = await prisma.questionnaireVersion.findUnique({
    where: { id: question.questionnaireVersionId },
    select: { id: true, major: true, versionNumber: true, status: true },
  });
  if (!version) {
    return null;
  }
  return { question, version };
}

/** The currently published version for a major (with questions), or null. */
export async function getPublishedVersionRecord(major: Major) {
  return prisma.questionnaireVersion.findFirst({
    where: { major, status: "PUBLISHED" },
    include: VERSION_INCLUDE,
    orderBy: { publishedAt: "desc" },
  });
}


// ---------------------------------------------------------------------------
// Draft creation
// ---------------------------------------------------------------------------

/**
 * Creates a DRAFT version that is an exact copy of the current PUBLISHED
 * version (questions, options, weights). Returns the new draft version id.
 * When a DRAFT already exists for the major it is returned instead — there is
 * only ever one active draft per major, which keeps the workflow simple.
 */
export async function createDraftFromPublished(major: Major): Promise<string> {
  return runInTransaction(async (tx) => {
    const existingDraft = await tx.questionnaireVersion.findFirst({
      where: { major, status: "DRAFT" },
      select: { id: true },
      orderBy: { versionNumber: "desc" },
    });
    if (existingDraft) {
      return existingDraft.id;
    }

    const published = await tx.questionnaireVersion.findFirst({
      where: { major, status: "PUBLISHED" },
      include: VERSION_INCLUDE,
      orderBy: { publishedAt: "desc" },
    });

    const latest = await tx.questionnaireVersion.findFirst({
      where: { major },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });
    const nextVersionNumber = (latest?.versionNumber ?? 0) + 1;

    if (!published) {
      // No published questionnaire yet: start a brand-new draft.
      const empty = await tx.questionnaireVersion.create({
        data: { major, versionNumber: nextVersionNumber, status: "DRAFT" },
        select: { id: true },
      });
      return empty.id;
    }

    const questions = published.questions
      .slice()
      .sort((a, b) => a.order - b.order);

    // Sequential creates (no deep nesting) — the pg driver adapter does not
    // reliably order deep nested creates, and sequential writes are explicit.
    const created = await tx.questionnaireVersion.create({
      data: {
        major,
        versionNumber: nextVersionNumber,
        status: "DRAFT",
      },
      select: { id: true },
    });

    for (const question of questions) {
      const createdQuestion = await tx.question.create({
        data: {
          questionnaireVersionId: created.id,
          order: question.order,
          type: question.type,
          text: question.text,
          helpText: question.helpText,
          category: question.category,
          isRequired: question.isRequired,
        },
        select: { id: true },
      });

      const options = question.options
        .slice()
        .sort((a, b) => a.order - b.order);
      for (const option of options) {
        const createdOption = await tx.questionOption.create({
          data: {
            questionId: createdQuestion.id,
            order: option.order,
            label: option.label,
            numericValue: option.numericValue,
          },
          select: { id: true },
        });

        for (const weight of option.weights) {
          await tx.questionOptionWeight.create({
            data: {
              questionOptionId: createdOption.id,
              concentration: weight.concentration,
              weight: weight.weight,
            },
          });
        }
      }
    }

    return created.id;
  });
}

/** Creates an empty DRAFT version for a major (used when no version exists). */
export async function createEmptyDraft(major: Major): Promise<string> {
  return runInTransaction(async (tx) => {
    const existingDraft = await tx.questionnaireVersion.findFirst({
      where: { major, status: "DRAFT" },
      select: { id: true },
      orderBy: { versionNumber: "desc" },
    });
    if (existingDraft) {
      return existingDraft.id;
    }
    const latest = await tx.questionnaireVersion.findFirst({
      where: { major },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });
    const nextVersionNumber = (latest?.versionNumber ?? 0) + 1;
    const created = await tx.questionnaireVersion.create({
      data: { major, versionNumber: nextVersionNumber, status: "DRAFT" },
      select: { id: true },
    });
    return created.id;
  });
}


// ---------------------------------------------------------------------------
// Question mutations (DRAFT only)
// ---------------------------------------------------------------------------

/** Adds a question to the end of a DRAFT version. */
export async function addQuestionToVersion(
  versionId: string,
  input: QuestionEditorInput,
): Promise<string> {
  return runInTransaction(async (tx) => {
    const version = await findEditableDraft(tx, versionId);

    const maxOrder = version.questions.reduce(
      (max, question) => Math.max(max, question.order),
      0,
    );
    const nextOrder = maxOrder + 1;

    const question = await tx.question.create({
      data: {
        questionnaireVersionId: versionId,
        order: nextOrder,
        type: input.type,
        text: input.text.trim(),
        helpText: input.helpText?.trim() || null,
        isRequired: true,
      },
      select: { id: true },
    });

    for (const [index, option] of input.options.entries()) {
      assertWeightsValid(version.major, option.weights);
      await tx.questionOption.create({
        data: {
          questionId: question.id,
          order: index + 1,
          label: option.label.trim(),
          numericValue: computeNumericValue(input.type, index),
          weights: {
            create: Object.entries(option.weights).map(
              ([concentration, weight]) => ({
                concentration: concentration as Concentration,
                weight: weight as number,
              }),
            ),
          },
        },
      });
    }

    return question.id;
  });
}

/** Updates a question (text/type/help) inside a DRAFT version. */
export async function updateQuestionInDraft(
  questionId: string,
  input: { type: QuestionType; text: string; helpText: string | null },
): Promise<void> {
  await runInTransaction(async (tx) => {
    const question = await tx.question.findUnique({
      where: { id: questionId },
      select: { questionnaireVersionId: true },
    });
    if (!question) {
      throw new QuestionnaireAdminError("not-found", "Question not found.");
    }
    const version = await findEditableDraft(tx, question.questionnaireVersionId);

    await tx.question.update({
      where: { id: questionId },
      data: {
        type: input.type,
        text: input.text.trim(),
        helpText: input.helpText?.trim() || null,
        category: version.questions.find((q) => q.id === questionId)?.category ?? null,
      },
    });
  });
}

/** Deletes a question (and its options/weights) from a DRAFT version. */
export async function deleteQuestionFromDraft(questionId: string): Promise<void> {
  await runInTransaction(async (tx) => {
    const question = await tx.question.findUnique({
      where: { id: questionId },
      select: { questionnaireVersionId: true, order: true },
    });
    if (!question) {
      throw new QuestionnaireAdminError("not-found", "Question not found.");
    }
    await findEditableDraft(tx, question.questionnaireVersionId);

    await tx.question.delete({ where: { id: questionId } });

    // Renumber the remaining questions so order stays gap-free (1..N).
    const remaining = await tx.question.findMany({
      where: { questionnaireVersionId: question.questionnaireVersionId },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    for (const [index, item] of remaining.entries()) {
      await tx.question.update({
        where: { id: item.id },
        data: { order: index + 1 },
      });
    }
  });
}

/** Moves a question up or down within its DRAFT version. */
export async function moveQuestionInDraft(
  questionId: string,
  direction: "up" | "down",
): Promise<void> {
  await runInTransaction(async (tx) => {
    const question = await tx.question.findUnique({
      where: { id: questionId },
      select: { questionnaireVersionId: true, order: true },
    });
    if (!question) {
      throw new QuestionnaireAdminError("not-found", "Question not found.");
    }
    await findEditableDraft(tx, question.questionnaireVersionId);

    const siblings = await tx.question.findMany({
      where: { questionnaireVersionId: question.questionnaireVersionId },
      orderBy: { order: "asc" },
      select: { id: true, order: true },
    });
    const index = siblings.findIndex((sibling) => sibling.id === questionId);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || swapIndex < 0 || swapIndex >= siblings.length) {
      return;
    }
    await tx.question.update({
      where: { id: siblings[index].id },
      data: { order: siblings[swapIndex].order },
    });
    await tx.question.update({
      where: { id: siblings[swapIndex].id },
      data: { order: siblings[index].order },
    });
  });
}


// ---------------------------------------------------------------------------
// Option mutations (DRAFT only)
// ---------------------------------------------------------------------------

/** Adds an option to a question inside a DRAFT version. */
export async function addOptionToQuestion(
  questionId: string,
  input: { label: string },
): Promise<void> {
  await runInTransaction(async (tx) => {
    const question = await tx.question.findUnique({
      where: { id: questionId },
      select: { questionnaireVersionId: true },
    });
    if (!question) {
      throw new QuestionnaireAdminError("not-found", "Question not found.");
    }
    await findEditableDraft(tx, question.questionnaireVersionId);

    const maxOrder = await tx.questionOption.aggregate({
      where: { questionId },
      _max: { order: true },
    });
    await tx.questionOption.create({
      data: {
        questionId,
        order: (maxOrder._max.order ?? 0) + 1,
        label: input.label.trim(),
        numericValue: null,
      },
    });
  });
}

/** Updates an option label inside a DRAFT version. */
export async function updateOptionInDraft(
  optionId: string,
  input: { label: string },
): Promise<void> {
  await runInTransaction(async (tx) => {
    const option = await tx.questionOption.findUnique({
      where: { id: optionId },
      select: { question: { select: { questionnaireVersionId: true } } },
    });
    if (!option) {
      throw new QuestionnaireAdminError("not-found", "Answer option not found.");
    }
    await findEditableDraft(tx, option.question.questionnaireVersionId);
    await tx.questionOption.update({
      where: { id: optionId },
      data: { label: input.label.trim() },
    });
  });
}

/** Deletes an option (and its weights) from a DRAFT version. */
export async function deleteOptionFromDraft(optionId: string): Promise<void> {
  await runInTransaction(async (tx) => {
    const option = await tx.questionOption.findUnique({
      where: { id: optionId },
      select: { questionId: true, order: true },
    });
    if (!option) {
      throw new QuestionnaireAdminError("not-found", "Answer option not found.");
    }
    const question = await tx.question.findUnique({
      where: { id: option.questionId },
      select: { questionnaireVersionId: true },
    });
    if (!question) {
      throw new QuestionnaireAdminError("not-found", "Question not found.");
    }
    await findEditableDraft(tx, question.questionnaireVersionId);

    await tx.questionOption.delete({ where: { id: optionId } });

    const remaining = await tx.questionOption.findMany({
      where: { questionId: option.questionId },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    for (const [index, item] of remaining.entries()) {
      await tx.questionOption.update({
        where: { id: item.id },
        data: { order: index + 1 },
      });
    }
  });
}

/** Moves an option up or down within its question (DRAFT only). */
export async function moveOptionInDraft(
  optionId: string,
  direction: "up" | "down",
): Promise<void> {
  await runInTransaction(async (tx) => {
    const option = await tx.questionOption.findUnique({
      where: { id: optionId },
      select: { questionId: true, order: true },
    });
    if (!option) {
      throw new QuestionnaireAdminError("not-found", "Answer option not found.");
    }
    const question = await tx.question.findUnique({
      where: { id: option.questionId },
      select: { questionnaireVersionId: true },
    });
    if (!question) {
      throw new QuestionnaireAdminError("not-found", "Question not found.");
    }
    await findEditableDraft(tx, question.questionnaireVersionId);

    const siblings = await tx.questionOption.findMany({
      where: { questionId: option.questionId },
      orderBy: { order: "asc" },
      select: { id: true, order: true },
    });
    const index = siblings.findIndex((sibling) => sibling.id === optionId);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || swapIndex < 0 || swapIndex >= siblings.length) {
      return;
    }
    await tx.questionOption.update({
      where: { id: siblings[index].id },
      data: { order: siblings[swapIndex].order },
    });
    await tx.questionOption.update({
      where: { id: siblings[swapIndex].id },
      data: { order: siblings[index].order },
    });
  });
}


/**
 * Replaces the full weight configuration of one option (DRAFT only).
 * The admin UI always sends the complete matrix, so zero entries remove rows
 * and non-zero entries upsert rows (never duplicates).
 */
export async function updateOptionWeightsInDraft(
  optionId: string,
  weights: Partial<Record<Concentration, number>>,
): Promise<void> {
  await runInTransaction(async (tx) => {
    const option = await tx.questionOption.findUnique({
      where: { id: optionId },
      select: {
        question: { select: { questionnaireVersionId: true } },
      },
    });
    if (!option) {
      throw new QuestionnaireAdminError("not-found", "Answer option not found.");
    }
    const version = await findEditableDraft(tx, option.question.questionnaireVersionId);
    assertWeightsValid(version.major, weights);

    const existing = await tx.questionOptionWeight.findMany({
      where: { questionOptionId: optionId },
      select: { id: true, concentration: true },
    });
    const existingByConcentration = new Map(
      existing.map((row) => [row.concentration, row.id]),
    );

    for (const concentration of CONCENTRATIONS_BY_MAJOR[version.major]) {
      const weight = weights[concentration] ?? 0;
      const existingId = existingByConcentration.get(concentration);
      if (existingId) {
        await tx.questionOptionWeight.update({
          where: { id: existingId },
          data: { weight },
        });
      } else if (weight !== 0) {
        await tx.questionOptionWeight.create({
          data: { questionOptionId: optionId, concentration, weight },
        });
      }
    }

    // Remove weights that were reset to 0 (the admin UI sends the full matrix).
    for (const concentration of CONCENTRATIONS_BY_MAJOR[version.major]) {
      if ((weights[concentration] ?? 0) === 0) {
        const id = existingByConcentration.get(concentration);
        if (id) {
          await tx.questionOptionWeight.delete({ where: { id } });
        }
      }
    }
  });
}


// ---------------------------------------------------------------------------
// Publish
// ---------------------------------------------------------------------------

/**
 * Validates and atomically publishes a DRAFT version.
 *
 * Transaction sequence (requirement 62):
 *   1. reload the draft with its questions/options/weights;
 *   2. run the full publish validation (exactly 20 questions, valid orders,
 *      labels, weights, coverage) INSIDE the transaction;
 *   3. archive any other PUBLISHED version of the same major;
 *   4. mark this version PUBLISHED and set publishedAt;
 *   5. commit.
 *
 * A failure at any step rolls back everything, so a major can never end up
 * with two active published versions due to a partial failure.
 */
export async function publishDraftVersion(versionId: string): Promise<void> {
  await runInTransaction(async (tx) => {
    const record = await tx.questionnaireVersion.findUnique({
      where: { id: versionId },
      include: VERSION_INCLUDE,
    });
    if (!record) {
      throw new QuestionnaireAdminError("not-found", "Questionnaire version not found.");
    }
    if (record.status !== "DRAFT") {
      throw new QuestionnaireAdminError(
        "not-draft",
        "Only draft questionnaires can be published.",
      );
    }

    const version = mapVersionRecordToShape(record);
    const validation = validateQuestionnaireForPublish(version);
    if (!validation.valid) {
      throw new QuestionnaireAdminError(
        "validation",
        validation.errors.join("\n"),
      );
    }

    await tx.questionnaireVersion.updateMany({
      where: { major: record.major, status: "PUBLISHED" },
      data: { status: "ARCHIVED" },
    });

    await tx.questionnaireVersion.update({
      where: { id: versionId },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
  });
}

/** Deletes a DRAFT version (destructive; published/archived are protected). */
export async function deleteDraftVersion(versionId: string): Promise<void> {
  await runInTransaction(async (tx) => {
    const record = await tx.questionnaireVersion.findUnique({
      where: { id: versionId },
      select: { status: true },
    });
    if (!record) {
      throw new QuestionnaireAdminError("not-found", "Questionnaire version not found.");
    }
    if (record.status !== "DRAFT") {
      throw new QuestionnaireAdminError(
        "not-draft",
        "Only draft questionnaires can be deleted.",
      );
    }
    await tx.questionnaireVersion.delete({ where: { id: versionId } });
  });
}

