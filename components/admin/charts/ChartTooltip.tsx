"use client";

import type { TooltipContentProps } from "recharts";

/**
 * Shared chart tooltip (client component, STEP 10).
 *
 * A single consistent tooltip for every dashboard chart: shows the category
 * label, the numeric value with a unit, and — when the datum carries one — the
 * percentage share. Rendered as a plain styled <div> so it is fully readable
 * and works with recharts' default hover/keyboard interaction.
 */

type ChartTooltipDatum = {
  name: string;
  count: number;
  percentage?: number | null;
};

type Props = TooltipContentProps & {
  /** Unit appended to every numeric value, e.g. "assessments". */
  valueUnit?: string;
  /** Optional transform for the tooltip title label. */
  titleFormatter?: (label: string | number) => string;
};

export function ChartTooltip({
  active,
  label,
  payload,
  valueUnit = "assessments",
  titleFormatter,
}: Props) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const title = titleFormatter && label !== undefined ? titleFormatter(label) : label;

  return (
    <div className="pointer-events-none rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      {title !== undefined ? (
        <p className="text-xs font-semibold text-slate-700">{String(title)}</p>
      ) : null}
      <ul className="mt-1 space-y-1">
        {payload.map((entry, index) => {
          const datum = entry.payload as ChartTooltipDatum | undefined;
          const value = Array.isArray(entry.value)
            ? entry.value.join(", ")
            : String(entry.value);
          return (
            <li key={index} className="flex items-center gap-2 text-xs text-slate-600">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-semibold text-slate-800">
                {value} {valueUnit}
              </span>
              {typeof datum?.percentage === "number" ? (
                <span className="text-slate-400">({datum.percentage}%)</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

