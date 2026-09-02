"use client";

import type { Concentration } from "@/data/concentrations";
import { getConcentrationLabel } from "@/data/concentrations";
import { MAX_WEIGHT, MIN_WEIGHT } from "@/lib/questionnaires/validation";

export type WeightEditorOption = {
  id?: string;
  label: string;
  weights: Partial<Record<Concentration, number>>;
};

/**
 * Responsive scoring-weight grid (admin-only).
 *
 * For every option the admin sets one integer weight (0–5) per concentration.
 * On small screens the matrix stacks into per-option cards so it stays
 * usable; on larger screens a compact grid is used. Every input is labelled
 * and keyboard-accessible.
 *
 * Guidance shown to admins (requirement 23):
 *   0 = no signal, 1–2 = weak, 3 = moderate, 4–5 = strong.
 * An answer may contribute to several concentrations.
 */
export function WeightEditor({
  concentrations,
  options,
  onChange,
}: {
  concentrations: readonly Concentration[];
  options: readonly WeightEditorOption[];
  onChange: (optionIndex: number, concentration: Concentration, weight: number) => void;
}) {
  return (
    <div>
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
        <h3 className="text-sm font-semibold text-brand-900">
          Scoring Weights
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-brand-800">
          Set how strongly this answer indicates each concentration.
          <br />
          0 = no signal · 1–2 = weak · 3 = moderate · 4–5 = strong.
          <br />
          An answer may contribute to several concentrations.
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {options.map((option, optionIndex) => (
          <fieldset
            key={option.id ?? `new-${optionIndex}`}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <legend className="sr-only">
              Weights for option {optionIndex + 1}
            </legend>
            <p className="text-sm font-semibold text-slate-800">
              <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
                {optionIndex + 1}
              </span>
              {option.label || `Option ${optionIndex + 1}`}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {concentrations.map((concentration) => {
                const value = option.weights[concentration] ?? 0;
                return (
                  <div key={concentration}>
                    <label
                      htmlFor={`weight-${optionIndex}-${concentration}`}
                      className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {getConcentrationLabel(concentration).split(" (")[0]}
                    </label>
                    <input
                      id={`weight-${optionIndex}-${concentration}`}
                      type="number"
                      min={MIN_WEIGHT}
                      max={MAX_WEIGHT}
                      step={1}
                      inputMode="numeric"
                      value={value}
                      onChange={(event) => {
                        const parsed = Number(event.target.value);
                        if (Number.isNaN(parsed)) {
                          return;
                        }
                        const clamped = Math.max(
                          MIN_WEIGHT,
                          Math.min(MAX_WEIGHT, Math.trunc(parsed)),
                        );
                        onChange(optionIndex, concentration, clamped);
                      }}
                      aria-label={`Weight for option ${optionIndex + 1} (${option.label || "untitled"}) toward ${getConcentrationLabel(concentration)}`}
                      className="focus-ring mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 shadow-sm focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1"
                    />
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
