"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { ConfirmDialog } from "@/components/assessment/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import {
  deleteQuestionAction,
  moveQuestionAction,
} from "@/lib/admin/questionnaire-actions";
import type { QuestionType } from "@/data/questionTypes";

export type QuestionListRow = {
  id: string;
  order: number;
  type: QuestionType;
  text: string;
  category: string | null;
  optionCount: number;
};

const TYPE_LABELS: Record<QuestionType, string> = {
  LIKERT: "Likert",
  AGREEMENT: "Agreement",
  MULTIPLE_CHOICE: "Multiple choice",
  SCENARIO: "Scenario",
  PRIORITY: "Priority",
};

/**
 * Admin question list inside a version. Read-only for published/archived
 * versions; DRAFT versions get Edit / Delete / Move Up / Move Down controls.
 */
export function QuestionList({
  versionId,
  questions,
  editable,
}: {
  versionId: string;
  questions: readonly QuestionListRow[];
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const pendingDelete = questions.find((q) => q.id === pendingDeleteId) ?? null;

  function handleDelete() {
    if (!pendingDeleteId) {
      return;
    }
    const questionId = pendingDeleteId;
    setPendingDeleteId(null);
    startTransition(async () => {
      const result = await deleteQuestionAction(questionId);
      if (!result.ok) {
        setActionError(result.error ?? "Could not delete the question.");
        return;
      }
      setActionError(null);
      router.refresh();
    });
  }

  function handleMove(questionId: string, direction: "up" | "down") {
    startTransition(async () => {
      const result = await moveQuestionAction(questionId, direction);
      if (!result.ok) {
        setActionError(result.error ?? "Could not move the question.");
        return;
      }
      setActionError(null);
      router.refresh();
    });
  }

  return (
    <div>
      <ol className="space-y-3">
        {questions.map((question, index) => (
          <li
            key={question.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-brand-800">
                    {question.order}.
                  </span>
                  <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-800">
                    {TYPE_LABELS[question.type]}
                  </span>
                  {question.category ? (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      {question.category}
                    </span>
                  ) : null}
                  <span className="text-xs text-slate-400">
                    {question.optionCount}{" "}
                    {question.optionCount === 1 ? "option" : "options"}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-800">
                  {question.text}
                </p>
              </div>
              {editable ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    href={`/admin/questions/${versionId}/questions/${question.id}/edit`}
                  >
                    Edit
                  </Button>
                  <button
                    type="button"
                    aria-label={`Move question ${question.order} up`}
                    disabled={index === 0 || pending}
                    onClick={() => handleMove(question.id, "up")}
                    className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move question ${question.order} down`}
                    disabled={index === questions.length - 1 || pending}
                    onClick={() => handleMove(question.id, "down")}
                    className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(question.id)}
                    disabled={pending}
                    className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border border-accent-200 bg-white px-3.5 text-sm font-semibold text-accent-700 transition-colors hover:bg-accent-50 disabled:pointer-events-none disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      {actionError ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 text-sm font-medium text-accent-800"
        >
          {actionError}
        </p>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete Question?"
        description={`This question and its answer options and weight configuration will be removed from this draft: "${pendingDelete?.text ?? ""}"`}
        confirmLabel="Delete Question"
        pending={pending}
        pendingConfirmLabel="Deleting…"
        onConfirm={handleDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      {!editable ? (
        <p className="mt-4 text-xs text-slate-500">
          This version is read-only. To change it, create a draft from the
          published version and edit the draft.
        </p>
      ) : null}
    </div>
  );
}

export function AddQuestionLink({ versionId }: { versionId: string }) {
  return (
    <Link
      href={`/admin/questions/${versionId}/questions/new`}
      className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 active:bg-brand-900"
    >
      + Add Question
    </Link>
  );
}

