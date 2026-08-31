"use client";

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

import { CHART_COLORS } from "@/lib/admin/chart-colors";
import type { MajorDistributionDatum } from "@/lib/admin/dashboard-utils";
import { ChartDataTable } from "./ChartDataTable";
import { ChartTooltip } from "./ChartTooltip";

/**
 * Assessments-by-major bar chart (client component, STEP 10).
 *
 * Vertical bars: Informatics (President University navy) and Information
 * Systems (neutral slate). Colors are visual distinctions only — they never
 * encode meaning. The chart adapts to its container width via
 * ResponsiveContainer and is always accompanied by an accessible data table.
 */
export function MajorDistributionChart({
  data,
}: {
  data: MajorDistributionDatum[];
}) {
  if (data.length === 0) {
    return null;
  }

  const rows = data.map((datum) => ({
    label: datum.name,
    value:
      datum.percentage === null
        ? String(datum.count)
        : `${datum.count} (${datum.percentage}%)`,
  }));

  return (
    <figure>
      <div
        role="img"
        aria-label="Bar chart of completed assessments by major."
        className="mt-4 h-64 w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="28%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={CHART_COLORS.grid}
            />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={40}
              tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: CHART_COLORS.cursor }}
              content={(props) => <ChartTooltip {...props} valueUnit="assessments" />}
            />
            <Bar
              dataKey="count"
              name="Assessments"
              radius={[6, 6, 0, 0]}
              maxBarSize={64}
              isAnimationActive={false}
            >
              {data.map((datum, index) => (
                <Cell
                  key={datum.name}
                  fill={
                    index === 0
                      ? CHART_COLORS.informatics
                      : CHART_COLORS.informationSystems
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable caption="Completed assessments by major" rows={rows} />
    </figure>
  );
}
