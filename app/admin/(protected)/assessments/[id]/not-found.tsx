import Link from "next/link";

import { ADMIN_ASSESSMENTS_ROUTE } from "@/lib/auth/config";

/**
 * Admin not-found state for /admin/assessments/[id]. Unknown ids render this
 * clean page instead of leaking database errors.
 */
export default function AssessmentNotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Assessment Not Found
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        The assessment record you are looking for does not exist or may have
        been deleted.
      </p>
      <Link
        href={ADMIN_ASSESSMENTS_ROUTE}
        className="focus-ring mt-6 inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-brand-900 transition-colors hover:border-brand-300 hover:bg-brand-50"
      >
        Back to Assessments
      </Link>
    </div>
  );
}
