import Link from "next/link";

/**
 * STEP 11 pagination controls.
 *
 * Previous / Page X of Y / Next with navigation semantics. Unavailable actions
 * are rendered as disabled (non-link) elements so they never look clickable.
 * Every href is built by the parent with `buildAssessmentListHref`, which
 * preserves q/major/concentration/sort while changing only the page.
 */

export function AssessmentPagination({
  page,
  totalPages,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const prevHref = page > 1 ? hrefForPage(page - 1) : null;
  const nextHref = page < totalPages ? hrefForPage(page + 1) : null;

  const linkClasses =
    "focus-ring inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-brand-900 transition-colors hover:border-brand-300 hover:bg-brand-50";
  const disabledClasses =
    "inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-400";

  return (
    <nav
      aria-label="Assessment pages"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      {prevHref ? (
        <Link href={prevHref} className={linkClasses}>
          Previous
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClasses}>
          Previous
        </span>
      )}
      <p className="text-sm text-slate-600">
        Page {page} of {totalPages}
      </p>
      {nextHref ? (
        <Link href={nextHref} className={linkClasses}>
          Next
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClasses}>
          Next
        </span>
      )}
    </nav>
  );
}
