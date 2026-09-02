"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import {
  addQuestionAction,
  saveQuestionAction,
} from "@/lib/admin/questionnaire-actions";
import { WeightEditor, type WeightEditorOption } from "@/components/admin/questions/WeightEditor";
import type { Concentration } from "@/data/concentrations";
import type { QuestionType } from "@/data/questionTypes";

export type EditorQuestion = {
  id?: string;
  type: QuestionType;
  text: string;
  helpText: string | null;
  options: WeightEditorOption[];
};

const QUESTION_TYPES: ReadonlyArray<{ value: QuestionType; label: string }> = [
  { value: "LIKERT", label: "Likert scale (interest)" },
  { value: "AGREEMENT", label: "Agreement scale" },
  { value: "MULTIPLE_CHOICE", label: "Multiple choice" },
  { value: "SCENARIO", label: "Scenario" },
  { value: "PRIORITY", label: "Priority / importance" },
];

const TYPE_HELP: Record<QuestionType, string> = {
  LIKERT: "A five-level interest scale (e.g. Not interested → Very interested).",
  AGREEMENT: "A five-level agreement scale (Strongly Disagree → Strongly Agree).",
  MULTIPLE_CHOICE: "A choice between 2–5 options describing preferences.",
  SCENARIO: "A short scenario followed by roles the student can choose from.",
  PRIORITY: "A five-level importance scale (Not important → Very important).",
};

function emptyOptions(count: number): WeightEditorOption[] {
  return Array.from({ length: count }, () => ({ label: "", weights: {} }));
}

/**
 * Full question editor: question info, options, weights, client-side
 * validation, and Save. Used by both the Add Question and Edit Question
 * routes. Weights are always saved with the question.
 */
export function QuestionEditor({
  versionId,
  questionId,
  initialQuestion,
  concentrations,
  cancelHref,
}: {
  versionId: string;
  questionId?: string;
  initialQuestion?: EditorQuestion;
  concentrations: readonly Concentration[];
  cancelHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const [type, setType] = useState<QuestionType>(
    initialQuestion?.type ?? "LIKERT",
  );
  const [text, setText] = useState(initialQuestion?.text ?? "");
  const [helpText, setHelpText] = useState(initialQuestion?.helpText ?? "");
  const [options, setOptions] = useState<WeightEditorOption[]>(
    initialQuestion?.options.length
      ? initialQuestion.options.map((option) => ({
          id: option.id,
          label: option.label,
          weights: { ...option.weights },
        }))
      : emptyOptions(5),
  );

  const isEditing = Boolean(questionId);

  function updateOptionLabel(index: number, label: string) {
    setOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? { ...option, label } : option,
      ),
    );
  }

  function updateOptionWeight(
    optionIndex: number,
    concentration: Concentration,
    weight: number,
  ) {
    setOptions((current) =>
      current.map((option, index) =>
        index === optionIndex
          ? {
              ...option,
              weights: { ...option.weights, [concentration]: weight },
            }
          : option,
      ),
    );
  }

  function addOption() {
    setOptions((current) => [...current, { label: "", weights: {} }]);
  }

  function removeOption(index: number) {
    setOptions((current) => current.filter((_, optionIndex) => optionIndex !== index));
  }

  function moveOption(index: number, direction: "up" | "down") {
    setOptions((current) => {
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= current.length) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }

  function validate(): string | null {
    if (!text.trim()) {
      return "Question text is required.";
    }
    if (options.length < 2) {
      return "Each question needs at least 2 answer options.";
    }
    for (const [index, option] of options.entries()) {
      if (!option.label.trim()) {
        return `Option ${index + 1} needs a label.`;
      }
    }
    return null;
  }

  function handleSave() {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    const input = {
      type,
      text: text.trim(),
      helpText: helpText.trim() || null,
      options: options.map((option) => ({
        id: option.id,
        label: option.label.trim(),
        weights: option.weights,
      })),
    };

    startTransition(async () => {
      const result = questionId
        ? await saveQuestionAction(questionId, input)
        : await addQuestionAction(versionId, input);
      if (!result.ok) {
        setFormError(result.error ?? "Could not save the question.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="question-info-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <h2 id="question-info-heading" className="text-base font-semibold text-brand-900">
          Question Information
        </h2>

        <div className="mt-4 space-y-5">
          <div>
            <label htmlFor="question-type" className="mb-1.5 block text-sm font-medium text-slate-800">
              Question Type
            </label>
            <select
              id="question-type"
              value={type}
              onChange={(event) => setType(event.target.value as QuestionType)}
              className="focus-ring w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              {QUESTION_TYPES.map((questionType) => (
                <option key={questionType.value} value={questionType.value}>
                  {questionType.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-sm text-slate-500">{TYPE_HELP[type]}</p>
          </div>

          <div>
            <label htmlFor="question-text" className="mb-1.5 block text-sm font-medium text-slate-800">
              Question Text
            </label>
            <textarea
              id="question-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={3}
              placeholder="Write the question exactly as students will see it."
              className="focus-ring w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600"
            />
          </div>

          <div>
            <label htmlFor="question-help" className="mb-1.5 block text-sm font-medium text-slate-800">
              Help / Instruction (optional)
            </label>
            <input
              id="question-help"
              value={helpText}
              onChange={(event) => setHelpText(event.target.value)}
              placeholder="Extra guidance shown above the answer options"
              className="focus-ring w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600"
            />
          </div>
        </div>
      </section>


      <section
        aria-labelledby="options-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="options-heading" className="text-base font-semibold text-brand-900">
              Answer Options
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Each question needs at least 2 options. Reorder with the arrows.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={addOption}>
            + Add Option
          </Button>
        </div>

        <ol className="mt-4 space-y-3">
          {options.map((option, index) => (
            <li
              key={option.id ?? `new-${index}`}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
            >
              <div className="flex flex-wrap items-start gap-2">
                <span className="mt-2.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <label htmlFor={`option-label-${index}`} className="sr-only">
                    Label for option {index + 1}
                  </label>
                  <input
                    id={`option-label-${index}`}
                    value={option.label}
                    onChange={(event) => updateOptionLabel(index, event.target.value)}
                    placeholder={`Option ${index + 1} label`}
                    className="focus-ring w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Move option ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => moveOption(index, "up")}
                    className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move option ${index + 1} down`}
                    disabled={index === options.length - 1}
                    onClick={() => moveOption(index, "down")}
                    className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete option ${index + 1}`}
                    disabled={options.length <= 2}
                    onClick={() => removeOption(index)}
                    className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-accent-200 bg-white text-accent-700 transition-colors hover:bg-accent-50 disabled:pointer-events-none disabled:opacity-40"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>


      <section
        aria-labelledby="weights-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <h2 id="weights-heading" className="sr-only">
          Scoring Weights
        </h2>
        <WeightEditor
          concentrations={concentrations}
          options={options}
          onChange={updateOptionWeight}
        />
      </section>

      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 text-sm font-medium text-accent-800"
        >
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button href={cancelHref} variant="secondary">
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="w-full sm:w-auto"
        >
          {pending ? "Saving…" : isEditing ? "Save Changes" : "Add Question"}
        </Button>
      </div>
    </div>
  );
}

