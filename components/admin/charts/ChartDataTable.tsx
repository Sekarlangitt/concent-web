export type ChartDataTableRow = {
  label: string;
  value: string;
};

/**
 * Accessible, non-chart data context for every dashboard chart (STEP 10).
 *
 * Renders the chart's underlying numbers as a real HTML table inside a
 * <details> element, so administrators still understand the data when the
 * chart is not visible (screen readers, no-JS, print, or plain preference).
 * Charts are never the only source of information on the dashboard.
 */
export function ChartDataTable({
  caption,
  rows,
}: {
  caption: string;
  rows: ChartDataTableRow[];
}) {
  return (
    <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <summary className="cursor-pointer text-xs font-medium text-slate-600">
        View data table
      </summary>
      <table className="mt-2 w-full text-left text-xs">
        <caption className="sr-only">{caption}</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-slate-200 first:border-t-0">
              <th scope="row" className="py-1.5 pr-3 font-normal text-slate-600">
                {row.label}
              </th>
              <td className="py-1.5 text-right font-semibold tabular-nums text-slate-800">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
