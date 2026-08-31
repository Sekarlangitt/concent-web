import type { Prisma } from "@/lib/generated/prisma/client";
import {
  CONCENTRATION_IDS,
  CONCENTRATIONS_BY_MAJOR,
  type Concentration,
} from "@/data/concentrations";
import { MAJOR_IDS, type Major } from "@/lib/major";
import { ADMIN_ASSESSMENTS_ROUTE } from "@/lib/auth/config";

/**
 * STEP 11 assessment-list query parsing and building (pure, framework-neutral).
 *
 * Every URL query parameter for /admin/assessments is parsed and sanitized in
 * ONE place so page components never scatter unsafe casts:
 *
 *   q             — free-text search on the student's full name (case-insensitive)
 *   major         — INFORMATICS | INFORMATION_SYSTEMS
 *   concentration — one of the Concentration enum values
 *   sort          — newest | oldest | name_asc | name_desc | score_desc | score_asc
 *   page          — integer >= 1
 *
 * Rules enforced here:
 *  - Unknown/malformed values fall back to safe defaults (never a 500).
 *  - A concentration that does not belong to the selected major is reset to
 *    null (ignored) instead of producing a confusing empty result set.
 *  - Pages are 1-based; page < 1 or non-numeric input normalizes to page 1.
 *
 * Prisma types are imported with `import type`, so this module unit-tests in
 * Vitest without instantiating a database client.
 */

export const ASSESSMENTS_PAGE_SIZE = 10;
export const ASSESSMENTS_MAX_SEARCH_LENGTH = 100;

export const ASSESSMENT_SORT_IDS = [
  "newest",
  "oldest",
  "name_asc",
  "name_desc",
  "score_desc",
  "score_asc",
] as const;
export type AssessmentSortId = (typeof ASSESSMENT_SORT_IDS)[number];

export type AssessmentListParams = {
  /** Trimmed search term (truncated to the max length), or null when empty. */
  q: string | null;
  major: Major | null;
  /** Always compatible with `major` — reset to null when it is not. */
  concentration: Concentration | null;
  sort: AssessmentSortId;
  /** 1-based page number (>= 1). */
  page: number;
};

function firstString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isMajor(value: string | undefined): value is Major {
  return value !== undefined && MAJOR_IDS.includes(value as Major);
}

function isConcentration(value: string | undefined): value is Concentration {
  return value !== undefined && CONCENTRATION_IDS.includes(value as Concentration);
}

function isSort(value: string | undefined): value is AssessmentSortId {
  return value !== undefined && ASSESSMENT_SORT_IDS.includes(value as AssessmentSortId);
}

/** Parses the page parameter; any non-positive-integer input becomes 1. */
export function parseAssessmentPage(value: string | undefined): number {
  if (!value) {
    return 1;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

/**
 * Parses and sanitizes the raw /admin/assessments query parameters.
 * Unknown majors/concentrations/sorts are dropped; the incompatible
 * major+concentration combination is reset to "all concentrations".
 */
export function parseAssessmentListParams(
  raw: Record<string, string | string[] | undefined>,
): AssessmentListParams {
  const qValue = firstString(raw.q);
  const q =
    qValue && qValue.trim()
      ? qValue.trim().slice(0, ASSESSMENTS_MAX_SEARCH_LENGTH)
      : null;

  const majorValue = firstString(raw.major);
  const major = isMajor(majorValue) ? majorValue : null;

  const concentrationValue = firstString(raw.concentration);
  const concentration = isConcentration(concentrationValue) ? concentrationValue : null;

  const compatibleConcentration =
    major && concentration && !CONCENTRATIONS_BY_MAJOR[major].includes(concentration)
      ? null
      : concentration;

  const sortValue = firstString(raw.sort);
  const sort = isSort(sortValue) ? sortValue : "newest";

  return {
    q,
    major,
    concentration: compatibleConcentration,
    sort,
    page: parseAssessmentPage(firstString(raw.page)),
  };
}

/**
 * Builds the Prisma `where` for the completed-assessment list.
 *
 * `completedAt != null` matches the dashboard's completed-assessment semantics,
 * so only persisted, completed records are ever listed. Search uses a
 * parameterized case-insensitive contains (Prisma `mode: "insensitive"` on
 * PostgreSQL) — the term is passed as a query parameter, never concatenated
 * into SQL.
 */
export function buildAssessmentWhere(params: {
  q: string | null;
  major: Major | null;
  concentration: Concentration | null;
}): Prisma.AssessmentWhereInput {
  const where: Prisma.AssessmentWhereInput = { completedAt: { not: null } };

  if (params.q) {
    where.fullName = { contains: params.q, mode: "insensitive" };
  }
  if (params.major) {
    where.major = params.major;
  }
  if (params.concentration) {
    where.recommendedConcentration = params.concentration;
  }

  return where;
}

/**
 * Maps a controlled sort id to Prisma orderBy clauses. Every order includes a
 * secondary stable key (id) so records never jump between pages when the
 * primary value ties.
 */
export function buildAssessmentOrderBy(
  sort: AssessmentSortId,
): Prisma.AssessmentOrderByWithRelationInput[] {
  switch (sort) {
    case "oldest":
      return [{ completedAt: "asc" }, { id: "asc" }];
    case "name_asc":
      return [{ fullName: "asc" }, { id: "asc" }];
    case "name_desc":
      return [{ fullName: "desc" }, { id: "desc" }];
    case "score_desc":
      return [{ recommendedScore: "desc" }, { id: "desc" }];
    case "score_asc":
      return [{ recommendedScore: "asc" }, { id: "asc" }];
    case "newest":
    default:
      // Default sort: newest first (completedAt desc), stable via id desc.
      return [{ completedAt: "desc" }, { id: "desc" }];
  }
}

/**
 * Concentrations offered by the filter dropdown. Adapts to the selected major
 * (6 for Informatics, 2 for Information Systems) and offers all eight when
 * "All Majors" is selected.
 */
export function getConcentrationFilterOptions(
  major: Major | null,
): readonly Concentration[] {
  return major ? CONCENTRATIONS_BY_MAJOR[major] : CONCENTRATION_IDS;
}

/**
 * Page-based pagination math (skip/take).
 *
 * A page beyond the last valid page is clamped to the last valid page; with
 * zero records there are zero pages and the page is normalized to 1. The page
 * component additionally redirects to the normalized URL so the address bar
 * stays canonical.
 */
export function getAssessmentPagination(
  page: number,
  pageSize: number,
  totalRecords: number,
): { page: number; totalPages: number; skip: number; take: number } {
  const totalPages = totalRecords <= 0 ? 0 : Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = totalPages === 0 ? 1 : Math.min(Math.max(1, Math.floor(page)), totalPages);
  return { page: safePage, totalPages, skip: (safePage - 1) * pageSize, take: pageSize };
}

/**
 * Builds a canonical /admin/assessments URL. Defaults are omitted (sort=newest
 * and page 1 produce a shorter, shareable URL). Used by pagination links
 * (preserving q/major/concentration/sort) and by Clear Filters.
 */
export function buildAssessmentListHref(params: {
  q?: string | null;
  major?: Major | null;
  concentration?: Concentration | null;
  sort?: AssessmentSortId | null;
  page?: number | null;
}): string {
  const query = new URLSearchParams();
  if (params.q) {
    query.set("q", params.q);
  }
  if (params.major) {
    query.set("major", params.major);
  }
  if (params.concentration) {
    query.set("concentration", params.concentration);
  }
  if (params.sort && params.sort !== "newest") {
    query.set("sort", params.sort);
  }
  if (params.page && params.page > 1) {
    query.set("page", String(params.page));
  }
  const queryString = query.toString();
  return queryString ? `${ADMIN_ASSESSMENTS_ROUTE}?${queryString}` : ADMIN_ASSESSMENTS_ROUTE;
}
