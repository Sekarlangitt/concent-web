"use client";

import type { YAxisTickContentProps } from "recharts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART_COLORS, CONCENTRATION_BAR_COLORS } from "@/lib/admin/chart-colors";
import { wrapLabel } from "@/lib/admin/dashboard-utils";
import { ChartDataTable } from "./ChartDataTable";
import { ChartTooltip } from "./ChartTooltip";

/** One horizontal bar: a human-readable concentration label + its count. */
export type RecommendationChartDatum = {
  name: string;
  count: number;
};

/** Width reserved for the (possibly multi-line) category labels. */
const LABEL_COLUMN_WIDTH = 190;

/**
 * Wrapped category tick for horizontal bar charts.
 *
 * Long concentration names ("Artificial Intelligence (AI) in Healthcare",
 * "Enterprise Resource Planning (ERP)") are wrapped at word boundaries onto
 * several lines so they never overlap the axis or clip. The full label also
 * appears in the tooltip and in the data table below the chart.
 */
function WrappedCategoryTick(props: YAxisTickContentProps) {
  const { x, y, payload } = props;
  const lines = wrapLabel(String(payload.value ?? ""));
  const lineHeight = 13;
  const firstLineOffset = ((lines.length - 1) * lineHeight) / 2;

  return (
    <text
      x={x}
      y={y}
      textAnchor="end"
      fill={CHART_COLORS.axis}
      fontSize={12}
      style={{ lineHeight: `${lineHeight}px` }}
    >
      {lines.map((line, index) => (
        <tspan key={`${index}-${line}`} x={x} dy={index === 0 ? -firstLineOffset : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/**
 * Generic horizontal-bar recommendation distribution chart (client component,
 * STEP 10). Used for both Informatics (6 concentrations) and Information
 * Systems (2 concentrations) charts.
 *
 * Horizontal orientation keeps long concentration labels readable. Bars are
 * colored deterministically by position from the shared palette. The chart is
 * accompanied by an accessible data table and never relied on as the only
 * source of information.
 */
export function RecommendationDistributionChart({
  data,
}: {
  data: RecommendationChartDatum[];
}) {
  if (data.length === 0) {
    return null;
  }

  const rows = data.map((datum) => ({
    label: datum.name,
    value: String(datum.count),
  }));

  const chartHeight = Math.max(data.length * 48, 160);

  return (
    <figure>
      <div
        role="img"
        aria-label="Horizontal bar chart of recommended concentrations and their counts."
        className="mt-4 w-full"
        style={{ height: chartHeight }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            barCategoryGap="20%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke={CHART_COLORS.grid}
            />
            <XAxis
              type="number"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={LABEL_COLUMN_WIDTH}
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={(props) => <WrappedCategoryTick {...props} />}
            />
            <Tooltip
              cursor={{ fill: CHART_COLORS.cursor }}
              content={(props) => <ChartTooltip {...props} valueUnit="assessments" />}
            />
            <Bar
              dataKey="count"
              name="Assessments"
              radius={[0, 6, 6, 0]}
              isAnimationActive={false}
            >
              {data.map((datum, index) => (
                <Cell
                  key={datum.name}
                  fill={CONCENTRATION_BAR_COLORS[index % CONCENTRATION_BAR_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable caption="Recommended concentrations and their counts" rows={rows} />
    </figure>
  );
}
