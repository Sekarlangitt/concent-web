"use client";

import { useState } from "react";

import type { Concentration } from "@/data/concentrations";
import { getConcentrationLabel } from "@/data/concentrations";
import type { QuestionType } from "@/data/questionTypes";

type PreviewOption = {
  id: string;
  label: string;
  weights: Partial<Record<Concentration, number>>;
};

type PreviewQuestion = {
  id: string;
  order: number;
  type: QuestionType;
  text: string;
  helpText: string | null;
  options: readonly PreviewOption[];
};

/**
 * Admin-only questionnaire preview. Renders the questions approximately as
 * students see them (no weights) with an admin-only "Show Weights" toggle.
 * The toggle is only ever rendered on protected admin routes.
 */
export function PreviewQuestionnaire({
  questions,
  concentrations,
}: {
  questions: readonly PreviewQuestion[];
  concentrations: readonly Concentration[];
}) {
  const [showWeights, setShowWeights] = useState(false);
  const total = questions.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
        <p className="text-sm font-medium text-brand-900">
          This is how students see the questionnaire. Weights are never shown
          to students.
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand-900">
          <input
            type="checkbox"
            checked={showWeights}
            onChange={(event) => setShowWeights(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
          />
          Show Weights
        </label>
      </div>

      <ol className="space-y-5">
        {questions.map((question) => (
          <li
            key={question.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <p className="text-sm font-bold text-brand-800">
              Question {question.order} of {total}
            </p>
            <h2 className="mt-1.5 text-lg font-semibold leading-snug tracking-tight text-slate-900">
              {question.text}
            </h2>
            {question.helpText ? (
              <p className="mt-2 text-sm text-slate-500">{question.helpText}</p>
            ) : null}

            <ul className="mt-4 space-y-2">
              {question.options.map((option, index) => (
                <li
                  key={option.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-2.5"
                >
                  <span className="min-w-6 text-sm font-semibold text-slate-400">
                    {index + 1}.
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-slate-800">
                    {option.label}
                  </span>
                  {showWeights ? (
                    <span className="flex flex-wrap gap-1.5">
                      {concentrations.map((concentration) => (
                        <span
                          key={concentration}
                          className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500"
                          title={getConcentrationLabel(concentration)}
                        >
                          {(option.weights[concentration] ?? 0) === 0 ? (
                            <span className="text-slate-300">–</span>
                          ) : (
                            option.weights[concentration]
                          )}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
