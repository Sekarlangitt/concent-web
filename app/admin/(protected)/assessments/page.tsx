import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AssessmentFilters } from "@/components/admin/assessments/AssessmentFilters";
import { AssessmentPagination } from "@/components/admin/assessments/AssessmentPagination";
import { AssessmentTable } from "@/components/admin/assessments/AssessmentTable";
import { Card } from "@/components/ui/Card";
import {
  buildAssessmentListHref,
  parseAssessmentListParams,
} from "@/lib/admin/assessment-query";
import { getAssessments } from "@/lib/admin/assessments";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = {
  title: "Assessment Records | President University",
  description: "Review and manage completed concentration assessments.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/assessments — protected assessment records list (STEP 11).
 *
 * A Server Component inside the (protected) route group. The trusted server-side
 * session check (requireAdmin) runs here as well as in the layout, so the page
 * never relies on client-side authentication state. Search/filters/sort/page
 * are read from the URL, parsed and sanitized by the central query parser, and
 * applied server-side by Prisma (the browser is never handed the full record
 * set).
 *
 * A page beyond the last valid page is redirected to the last valid page (or
 * page 1 when the filtered result set is empty) so the URL stays canonical.
 */

export default async function AdminAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const raw = await searchParams;
  const params = parseAssessmentListParams(raw);

  let result;
  try {
    result = await getAssessments(params);
  } catch (error) {
    console.error("[admin/assessments] failed to load records:", error);
    return <AssessmentRecordsLoadError />;
  }

  if (params.page > 1 && (result.totalPages === 0 || params.page > result.totalPages)) {
    redirect(buildAssessmentListHref({ ...params, page: result.totalPages }));
  }

  const currentListQuery = buildAssessmentListHref(params).split("?").slice(1).join("?");
  const hasFilters =
    params.q !== null ||
    params.major !== null ||
    params.concentration !== null ||
    params.sort !== "newest" ||
    params.page > 1;

  const firstOnPage =
    result.totalRecords === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const lastOnPage = Math.min(result.page * result.pageSize, result.totalRecords);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Assessment Records
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Review and manage completed concentration assessments.
        </p>
      </header>

      <AssessmentFilters
        key={`${params.q}|${params.major}|${params.concentration}|${params.sort}|${params.page}`}
        current={params}
      />

      {result.totalRecords > 0 ? (
        <>
          <p className="text-sm text-slate-600" aria-live="polite">
            Showing {firstOnPage}–{lastOnPage} of {result.totalRecords}{" "}
            {result.totalRecords === 1 ? "assessment" : "assessments"}
          </p>
          <AssessmentTable records={result.records} backQuery={currentListQuery} />
          <AssessmentPagination
            page={result.page}
            totalPages={result.totalPages}
            hrefForPage={(page) => buildAssessmentListHref({ ...params, page })}
          />
        </>
      ) : (
        <Card className="p-8 text-center sm:p-12">
          <h2 className="text-base font-semibold text-brand-900">
            {hasFilters
              ? "No assessments match your current search or filters."
              : "No completed assessments yet."}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
            {hasFilters
              ? "Try adjusting your search term or filters to find the assessment you are looking for."
              : "Once students complete and submit an assessment, its record will appear here."}
          </p>
          {hasFilters ? (
            <Link
              href={buildAssessmentListHref({})}
              className="focus-ring mt-5 inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-brand-900 transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              Clear Filters
            </Link>
          ) : null}
        </Card>
      )}
    </div>
  );
}

function AssessmentRecordsLoadError() {
  return (
    <div className="rounded-2xl border border-accent-200 bg-accent-50 p-6 sm:p-8">
      <h2 className="text-base font-semibold text-accent-800">
        Assessment records could not be loaded
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-accent-700">Please try again.</p>
    </div>
  );
}
