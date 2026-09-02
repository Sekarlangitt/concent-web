"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/admin";
import { ADMIN_QUESTIONS_ROUTE } from "@/lib/auth/config";
import type { Concentration } from "@/data/concentrations";
import type { Major } from "@/lib/major";
import { prisma } from "@/lib/prisma";
import {
  QuestionnaireAdminError,
  addOptionToQuestion,
  addQuestionToVersion,
  createDraftFromPublished,
  createEmptyDraft,
  deleteDraftVersion,
  deleteOptionFromDraft,
  deleteQuestionFromDraft,
  moveQuestionInDraft,
  publishDraftVersion,
  updateOptionInDraft,
  updateOptionWeightsInDraft,
  updateQuestionInDraft,
} from "@/lib/questionnaires/admin-questionnaire";
import { MAX_WEIGHT, MIN_WEIGHT } from "@/lib/questionnaires/validation";

/**
 * Admin questionnaire server actions.
 *
 * EVERY mutation re-verifies the admin session with requireAdmin() — the
 * protected layout alone is never trusted. Inputs are Zod-validated here, and
 * the domain rules (DRAFT-only editing, weight bounds, major-compatible
 * concentrations, atomic publish) are enforced by the questionnaire service.
 */

const majorActionSchema = z.enum(["INFORMATICS", "INFORMATION_SYSTEMS"]);
const directionSchema = z.enum(["up", "down"]);

const editorOptionSchema = z.object({
  id: z.string().trim().min(1).max(100).optional(),
  label: z.string().trim().min(1, "Every option needs a label.").max(1000),
  weights: z.record(
    z.string().min(1),
    z.coerce
      .number()
      .int("Weights must be whole numbers.")
      .min(MIN_WEIGHT, `Weights cannot be below ${MIN_WEIGHT}.`)
      .max(MAX_WEIGHT, `Weights cannot exceed ${MAX_WEIGHT}.`),
  ),
});

const questionEditorSchema = z.object({
  type: z.enum([
    "LIKERT",
    "AGREEMENT",
    "MULTIPLE_CHOICE",
    "SCENARIO",
    "PRIORITY",
  ]),
  text: z.string().trim().min(1, "Question text is required.").max(2000),
  helpText: z.string().trim().max(2000).nullable().optional(),
  options: z
    .array(editorOptionSchema)
    .min(2, "Each question needs at least 2 answer options.")
    .max(30),
});

export type QuestionActionState = {
  ok: boolean;
  error?: string;
};

function toError(error: unknown): string {
  if (error instanceof QuestionnaireAdminError) {
    return error.message;
  }
  console.error("[admin/questionnaire-actions]", error);
  return "Something went wrong. Please try again.";
}

function buildVersionHref(versionId: string): string {
  return `${ADMIN_QUESTIONS_ROUTE}/${versionId}`;
}

/** Creates a draft (cloned from the current published version) and opens it. */
export async function createDraftFromPublishedAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = majorActionSchema.safeParse(String(formData.get("major") ?? ""));
  if (!parsed.success) {
    redirect(ADMIN_QUESTIONS_ROUTE);
  }
  const versionId = await createDraftFromPublished(parsed.data as Major);
  revalidatePath(ADMIN_QUESTIONS_ROUTE);
  redirect(buildVersionHref(versionId));
}

/** Creates an empty draft and opens it. */
export async function createEmptyDraftAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = majorActionSchema.safeParse(String(formData.get("major") ?? ""));
  if (!parsed.success) {
    redirect(ADMIN_QUESTIONS_ROUTE);
  }
  const versionId = await createEmptyDraft(parsed.data as Major);
  revalidatePath(ADMIN_QUESTIONS_ROUTE);
  redirect(buildVersionHref(versionId));
}

/** Deletes a DRAFT version. */
export async function deleteDraftAction(
  versionId: string,
): Promise<QuestionActionState> {
  await requireAdmin();
  try {
    await deleteDraftVersion(versionId);
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
  revalidatePath(ADMIN_QUESTIONS_ROUTE);
  redirect(ADMIN_QUESTIONS_ROUTE);
}

/** Publishes a validated DRAFT version (atomic). */
export async function publishQuestionnaireAction(
  versionId: string,
): Promise<QuestionActionState> {
  await requireAdmin();
  try {
    await publishDraftVersion(versionId);
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
  revalidatePath(ADMIN_QUESTIONS_ROUTE);
  revalidatePath(buildVersionHref(versionId));
  redirect(ADMIN_QUESTIONS_ROUTE);
}

/** Adds a new question (with options and weights) to a DRAFT version. */
export async function addQuestionAction(
  versionId: string,
  rawInput: unknown,
): Promise<QuestionActionState> {
  await requireAdmin();
  const parsed = questionEditorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: firstIssue(parsed) };
  }
  let questionId: string;
  try {
    questionId = await addQuestionToVersion(versionId, {
      type: parsed.data.type,
      text: parsed.data.text,
      helpText: parsed.data.helpText ?? null,
      options: parsed.data.options.map((option) => ({
        id: option.id,
        label: option.label,
        weights: option.weights as Partial<Record<Concentration, number>>,
      })),
    });
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
  revalidatePath(buildVersionHref(versionId));
  redirect(buildQuestionEditHref(versionId, questionId));
}

/** Saves a full question edit (meta + options + weights) inside a DRAFT. */
export async function saveQuestionAction(
  questionId: string,
  rawInput: unknown,
): Promise<QuestionActionState> {
  await requireAdmin();
  const parsed = questionEditorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: firstIssue(parsed) };
  }
  let versionId: string;
  try {
    await updateQuestionInDraft(questionId, {
      type: parsed.data.type,
      text: parsed.data.text,
      helpText: parsed.data.helpText ?? null,
    });
    await syncOptionsAndWeights(questionId, parsed.data.options);
    versionId = await findQuestionVersionId(questionId);
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
  revalidatePath(buildVersionHref(versionId));
  redirect(buildVersionHref(versionId));
}


/** Deletes a question from a DRAFT version. */
export async function deleteQuestionAction(
  questionId: string,
): Promise<QuestionActionState> {
  await requireAdmin();
  try {
    await deleteQuestionFromDraft(questionId);
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
  revalidatePath(ADMIN_QUESTIONS_ROUTE);
  return { ok: true };
}

/** Moves a question up or down inside its DRAFT version. */
export async function moveQuestionAction(
  questionId: string,
  direction: "up" | "down",
): Promise<QuestionActionState> {
  await requireAdmin();
  const parsedDirection = directionSchema.safeParse(direction);
  if (!parsedDirection.success) {
    return { ok: false, error: "Invalid move direction." };
  }
  try {
    await moveQuestionInDraft(questionId, parsedDirection.data);
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
  revalidatePath(ADMIN_QUESTIONS_ROUTE);
  return { ok: true };
}

function buildQuestionEditHref(versionId: string, questionId: string): string {
  return `${buildVersionHref(versionId)}/questions/${questionId}/edit`;
}

function firstIssue(parsed: { error: z.ZodError }): string {
  return parsed.error.issues[0]?.message ?? "Invalid input.";
}

async function findQuestionVersionId(questionId: string): Promise<string> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { questionnaireVersionId: true },
  });
  if (!question) {
    throw new QuestionnaireAdminError("not-found", "Question not found.");
  }
  return question.questionnaireVersionId;
}

/**
 * Syncs the question's options/weights to match the editor state: updates
 * existing options (label + weights), creates new ones, deletes removed ones.
 * Option order is 1..N in the submitted array order.
 */
async function syncOptionsAndWeights(
  questionId: string,
  options: z.infer<typeof editorOptionSchema>[],
): Promise<void> {
  const existing = await prisma.questionOption.findMany({
    where: { questionId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((option) => option.id));
  const submittedIds = new Set(
    options.map((option) => option.id).filter((id): id is string => Boolean(id)),
  );

  for (const option of options) {
    if (option.id && existingIds.has(option.id)) {
      await updateOptionInDraft(option.id, { label: option.label });
      await updateOptionWeightsInDraft(
        option.id,
        option.weights as Partial<Record<Concentration, number>>,
      );
    } else if (!option.id) {
      await addOptionToQuestion(questionId, { label: option.label });
      const created = await prisma.questionOption.findFirst({
        where: { questionId, label: option.label },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (created) {
        await updateOptionWeightsInDraft(
          created.id,
          option.weights as Partial<Record<Concentration, number>>,
        );
      }
    }
  }

  for (const optionId of existingIds) {
    if (!submittedIds.has(optionId)) {
      await deleteOptionFromDraft(optionId);
    }
  }
}
