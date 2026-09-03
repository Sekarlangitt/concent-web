import { Card } from "@/components/ui/Card";
import type { Concentration } from "@/data/concentrations";
import { getConcentrationLabel } from "@/data/concentrations";
import { getConcentrationProgram } from "@/data/concentration-programs";

type ConcentrationProgramCardProps = {
  concentration: Concentration;
};

/**
 * Academic program card for the recommended concentration.
 *
 * Shown on the student result page and on the admin assessment-detail page.
 * Content is hardcoded display copy (see data/concentration-programs.ts):
 * each concentration shows its Semester-4 subject focus and relevant careers.
 * Entries marked `isPlaceholder` (if any are added later) render a friendly
 * "details coming soon" state instead of content lists.
 */
export function ConcentrationProgramCard({
  concentration,
}: ConcentrationProgramCardProps) {
  const label = getConcentrationLabel(concentration);
  const program = getConcentrationProgram(concentration);

  return (
    <Card className="p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
        Semester 4 Concentration Focus
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        {label}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base">
        {program.description}
      </p>
      {program.bestFor ? (
        <p className="mt-1.5 text-sm italic leading-relaxed text-slate-500">
          {program.bestFor}
        </p>
      ) : null}

      {program.isPlaceholder ? (
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-relaxed text-amber-800">
          Detailed program content for this concentration is not available yet.
          Please check back soon.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <section>
            <h3 className="text-sm font-semibold text-slate-800">
              What You&apos;ll Focus On
            </h3>
            {program.focusStatement ? (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {program.focusStatement}
              </p>
            ) : null}
            <ul className="mt-3 space-y-2">
              {program.topics.map((topic) => (
                <li key={topic} className="flex items-start gap-2 text-sm text-slate-700">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600"
                  />
                  <span className="min-w-0 leading-relaxed">{topic}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-800">
              Relevant Careers
            </h3>
            <ul className="mt-3 space-y-2">
              {program.careers.map((career) => (
                <li
                  key={career}
                  className="flex items-start gap-2 text-sm text-slate-700"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600"
                  />
                  <span className="min-w-0 leading-relaxed">{career}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </Card>
  );
}
