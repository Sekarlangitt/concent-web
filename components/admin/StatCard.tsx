import { Card } from "@/components/ui/Card";

/**
 * Dashboard summary card (STEP 10).
 *
 * A white card with a small uppercase label, a large value, and an optional
 * hint line. Used for: Total Assessments, Informatics, Information Systems,
 * and Average Suitability Score.
 */
export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-brand-900 tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </Card>
  );
}
