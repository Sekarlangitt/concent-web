"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART_COLORS } from "@/lib/admin/chart-colors";
import {
  formatShortDate,
  type AssessmentsOverTimeDatum,
} from "@/lib/admin/dashboard-utils";
import { ChartDataTable } from "./ChartDataTable";
import { ChartTooltip } from "./ChartTooltip";

/** SVG gradient id used by the area fill. Kept stable so hydration is safe. */
const AREA_FILL_ID = "assessments-over-time-fill";

/**
 * Assessments-over-time area chart (client component, STEP 10).
 *
 * Shows completed assessments per day over the last 30 days (UTC). Daily
 * buckets arrive from the server already zero-filled, so the chart never shows
 * gaps. X-axis ticks are formatted as short dates and thinned so they stay
 * readable at 375px, tablet, and desktop widths.
 */
export function AssessmentsOverTimeChart({
  data,
  rangeLabel,
}: {
  data: AssessmentsOverTimeDatum[];
  /** Short readable period description, e.g. "Last 30 days · 31 Jul – 31 Aug 2026". */
  rangeLabel: string;
}) {
  if (data.length === 0) {
    return null;
  }

  const rows = data.map((day) => ({
    label: formatShortDate(day.date),
    value: String(day.count),
  }));

  return (
    <figure>
      <div
        role="img"
        aria-label="Line chart of completed assessments per day over the last 30 days."
        className="mt-4 h-64 w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={AREA_FILL_ID} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.timeline} stopOpacity={0.25} />
                <stop offset="95%" stopColor={CHART_COLORS.timeline} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={CHART_COLORS.grid}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              interval={4}
              tickLine={false}
              axisLine={false}
              tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
            />
            <YAxis
              allowDecimals={false}
              width={32}
              tickLine={false}
              axisLine={false}
              tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
            />
            <Tooltip
              cursor={{ stroke: CHART_COLORS.axis, strokeDasharray: "3 3" }}
              content={(props) => (
                <ChartTooltip
                  {...props}
                  valueUnit="assessments"
                  titleFormatter={(label) => formatShortDate(String(label))}
                />
              )}
            />
            <Area
              type="monotone"
              dataKey="count"
              name="Assessments"
              stroke={CHART_COLORS.timeline}
              strokeWidth={2}
              fill={`url(#${AREA_FILL_ID})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-slate-500">{rangeLabel}</p>
      <ChartDataTable caption="Completed assessments per day (last 30 days)" rows={rows} />
    </figure>
  );
}
