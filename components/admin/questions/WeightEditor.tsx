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
 * Compact scoring-weight matrix (admin-only).
 *
 * Concentrations are column headers shown once at the top; each answer option
 * is one row: option label on the left, one weight input per concentration on
 * the same line. The table scrolls horizontally when there are many
 * concentrations (e.g. Informatics) or on small screens. Every input carries
 * an accessible label.
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
  const isWide = concentrations.length > 4;
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

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table
          className="w-full table-fixed border-collapse text-left text-sm"
          style={{ minWidth: 336 + concentrations.length * 104 }}
        >
          <caption className="sr-only">
            Scoring weights. For each answer option, enter one integer weight
            between {MIN_WEIGHT} and {MAX_WEIGHT} for every concentration.
          </caption>
          <colgroup>
            <col style={{ width: isWide ? "34%" : "40%" }} />
            {concentrations.map((concentration) => (
              <col key={concentration} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-slate-50">
              <th
                scope="col"
                className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Answer option
              </th>
              {concentrations.map((concentration) => {
                const label = getConcentrationLabel(concentration);
                return (
                  <th
                    key={concentration}
                    scope="col"
                    className="px-1 py-2.5 text-center"
                  >
                    <span
                      title={label}
                      className={
                        isWide
                          ? "mx-auto block max-w-full truncate px-0.5 text-[11px] font-semibold uppercase leading-tight tracking-wide text-slate-600"
                          : "mx-auto block max-w-full px-0.5 text-[11px] font-semibold uppercase leading-snug tracking-wide text-slate-600"
                      }
                    >
                      {label}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {options.map((option, optionIndex) => (
              <tr
                key={option.id ?? `new-${optionIndex}`}
                className="border-t border-slate-200"
              >
                <th
                  scope="row"
                  className="px-4 py-2.5 align-middle font-normal"
                >
                  <span className="flex items-start gap-2.5">
                    <span className="mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
                      {optionIndex + 1}
                    </span>
                    <span className="min-w-0 break-words text-sm font-medium leading-snug text-slate-800">
                      {option.label || `Option ${optionIndex + 1}`}
                    </span>
                  </span>
                </th>
                {concentrations.map((concentration) => {
                  const label = getConcentrationLabel(concentration);
                  const value = option.weights[concentration] ?? 0;
                  return (
                    <td
                      key={concentration}
                      className="px-1 py-2.5 text-center align-middle"
                    >
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
                        aria-label={`Weight for option ${optionIndex + 1} (${option.label || "untitled"}) toward ${label}`}
                        className="focus-ring mx-auto block w-16 rounded-lg border border-slate-300 bg-white px-1 py-1.5 text-center text-sm text-slate-900 shadow-sm focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
