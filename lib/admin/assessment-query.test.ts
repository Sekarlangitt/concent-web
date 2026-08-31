import { describe, expect, it } from "vitest";

import {
  ASSESSMENTS_MAX_SEARCH_LENGTH,
  ASSESSMENTS_PAGE_SIZE,
  buildAssessmentListHref,
  buildAssessmentOrderBy,
  buildAssessmentWhere,
  getAssessmentPagination,
  parseAssessmentListParams,
} from "@/lib/admin/assessment-query";

/* --------------------------------------------------------------------------
 * parseAssessmentListParams — query-parameter parsing/validation (STEP 11
 * requirements 14–27, 63, 65).
 * ------------------------------------------------------------------------ */

describe("parseAssessmentListParams", () => {
  it("parses a valid search term (q)", () => {
    const params = parseAssessmentListParams({ q: "  ayu  " });
    expect(params.q).toBe("ayu");
  });

  it("treats an empty/whitespace search as no filter", () => {
    expect(parseAssessmentListParams({ q: "" }).q).toBeNull();
    expect(parseAssessmentListParams({ q: "   " }).q).toBeNull();
    expect(parseAssessmentListParams({}).q).toBeNull();
  });

  it("truncates an over-long search term", () => {
    const long = "a".repeat(ASSESSMENTS_MAX_SEARCH_LENGTH + 50);
    expect(parseAssessmentListParams({ q: long }).q?.length).toBe(
      ASSESSMENTS_MAX_SEARCH_LENGTH,
    );
  });

  it("parses a valid major", () => {
    expect(parseAssessmentListParams({ major: "INFORMATICS" }).major).toBe(
      "INFORMATICS",
    );
    expect(parseAssessmentListParams({ major: "INFORMATION_SYSTEMS" }).major).toBe(
      "INFORMATION_SYSTEMS",
    );
  });

  it("rejects an invalid major safely (falls back to all majors)", () => {
    expect(parseAssessmentListParams({ major: "BIOLOGY" }).major).toBeNull();
  });

  it("parses a valid concentration", () => {
    expect(parseAssessmentListParams({ concentration: "AI" }).concentration).toBe(
      "AI",
    );
    expect(parseAssessmentListParams({ concentration: "ERP" }).concentration).toBe(
      "ERP",
    );
  });

  it("rejects an invalid concentration safely", () => {
    expect(
      parseAssessmentListParams({ concentration: "HACKING" }).concentration,
    ).toBeNull();
  });

  it("resets an incompatible major+concentration combination", () => {
    const params = parseAssessmentListParams({
      major: "INFORMATICS",
      concentration: "ERP",
    });
    expect(params.major).toBe("INFORMATICS");
    expect(params.concentration).toBeNull();

    const isCombination = parseAssessmentListParams({
      major: "INFORMATION_SYSTEMS",
      concentration: "CYBER_SECURITY",
    });
    expect(isCombination.major).toBe("INFORMATION_SYSTEMS");
    expect(isCombination.concentration).toBeNull();
  });

  it("keeps a compatible major+concentration combination", () => {
    const params = parseAssessmentListParams({
      major: "INFORMATICS",
      concentration: "AI_HEALTHCARE",
    });
    expect(params).toMatchObject({
      major: "INFORMATICS",
      concentration: "AI_HEALTHCARE",
    });
  });

  it("parses every supported sort id", () => {
    for (const sort of [
      "newest",
      "oldest",
      "name_asc",
      "name_desc",
      "score_desc",
      "score_asc",
    ]) {
      expect(parseAssessmentListParams({ sort }).sort).toBe(sort);
    }
  });

  it("falls back to newest for an unknown sort", () => {
    expect(parseAssessmentListParams({ sort: "random" }).sort).toBe("newest");
  });

  it("normalizes page < 1 to page 1", () => {
    expect(parseAssessmentListParams({ page: "0" }).page).toBe(1);
    expect(parseAssessmentListParams({ page: "-3" }).page).toBe(1);
  });

  it("normalizes a non-numeric page to page 1", () => {
    expect(parseAssessmentListParams({ page: "abc" }).page).toBe(1);
    expect(parseAssessmentListParams({ page: "1.5" }).page).toBe(1);
  });

  it("parses a valid page", () => {
    expect(parseAssessmentListParams({ page: "7" }).page).toBe(7);
  });

  it("ignores array values beyond the first entry", () => {
    const params = parseAssessmentListParams({
      q: ["ayu", "noise"],
      major: ["INFORMATICS"],
    });
    expect(params.q).toBe("ayu");
    expect(params.major).toBe("INFORMATICS");
  });
});

/* --------------------------------------------------------------------------
 * buildAssessmentWhere — pure Prisma where builder (requirement 91).
 * ------------------------------------------------------------------------ */

describe("buildAssessmentWhere", () => {
  it("always restricts to completed assessments", () => {
    expect(
      buildAssessmentWhere({ q: null, major: null, concentration: null }),
    ).toEqual({ completedAt: { not: null } });
  });

  it("adds a case-insensitive contains when q is present", () => {
    expect(
      buildAssessmentWhere({ q: "ayu", major: null, concentration: null }),
    ).toEqual({
      completedAt: { not: null },
      fullName: { contains: "ayu", mode: "insensitive" },
    });
  });

  it("adds major only", () => {
    expect(
      buildAssessmentWhere({ q: null, major: "INFORMATICS", concentration: null }),
    ).toEqual({ completedAt: { not: null }, major: "INFORMATICS" });
  });

  it("adds concentration only", () => {
    expect(
      buildAssessmentWhere({ q: null, major: null, concentration: "AI" }),
    ).toEqual({ completedAt: { not: null }, recommendedConcentration: "AI" });
  });

  it("combines q + major", () => {
    const where = buildAssessmentWhere({
      q: "ayu",
      major: "INFORMATION_SYSTEMS",
      concentration: null,
    });
    expect(where).toEqual({
      completedAt: { not: null },
      fullName: { contains: "ayu", mode: "insensitive" },
      major: "INFORMATION_SYSTEMS",
    });
  });

  it("combines major + concentration", () => {
    const where = buildAssessmentWhere({
      q: null,
      major: "INFORMATICS",
      concentration: "DEVOPS",
    });
    expect(where).toEqual({
      completedAt: { not: null },
      major: "INFORMATICS",
      recommendedConcentration: "DEVOPS",
    });
  });

  it("combines all filters", () => {
    const where = buildAssessmentWhere({
      q: "ayu",
      major: "INFORMATION_SYSTEMS",
      concentration: "ERP",
    });
    expect(where).toEqual({
      completedAt: { not: null },
      fullName: { contains: "ayu", mode: "insensitive" },
      major: "INFORMATION_SYSTEMS",
      recommendedConcentration: "ERP",
    });
  });
});

/* --------------------------------------------------------------------------
 * buildAssessmentOrderBy — sort mappings (requirement 93).
 * ------------------------------------------------------------------------ */

describe("buildAssessmentOrderBy", () => {
  it("maps newest to completedAt desc with a stable id tie-break", () => {
    expect(buildAssessmentOrderBy("newest")).toEqual([
      { completedAt: "desc" },
      { id: "desc" },
    ]);
  });

  it("maps oldest to completedAt asc with a stable id tie-break", () => {
    expect(buildAssessmentOrderBy("oldest")).toEqual([
      { completedAt: "asc" },
      { id: "asc" },
    ]);
  });

  it("maps name_asc and name_desc", () => {
    expect(buildAssessmentOrderBy("name_asc")).toEqual([
      { fullName: "asc" },
      { id: "asc" },
    ]);
    expect(buildAssessmentOrderBy("name_desc")).toEqual([
      { fullName: "desc" },
      { id: "desc" },
    ]);
  });

  it("maps score_desc and score_asc", () => {
    expect(buildAssessmentOrderBy("score_desc")).toEqual([
      { recommendedScore: "desc" },
      { id: "desc" },
    ]);
    expect(buildAssessmentOrderBy("score_asc")).toEqual([
      { recommendedScore: "asc" },
      { id: "asc" },
    ]);
  });
});

/* --------------------------------------------------------------------------
 * getAssessmentPagination — pagination math (requirement 92).
 * ------------------------------------------------------------------------ */

describe("getAssessmentPagination", () => {
  it("page 1 on a multi-page result set", () => {
    expect(getAssessmentPagination(1, 10, 37)).toEqual({
      page: 1,
      totalPages: 4,
      skip: 0,
      take: 10,
    });
  });

  it("page 2 skips the first page", () => {
    const result = getAssessmentPagination(2, 10, 37);
    expect(result).toMatchObject({ page: 2, totalPages: 4, skip: 10, take: 10 });
  });

  it("last page keeps the remainder", () => {
    const result = getAssessmentPagination(4, 10, 37);
    expect(result).toMatchObject({ page: 4, totalPages: 4, skip: 30, take: 10 });
  });

  it("zero results normalize to one safe page", () => {
    expect(getAssessmentPagination(1, 10, 0)).toEqual({
      page: 1,
      totalPages: 0,
      skip: 0,
      take: 10,
    });
  });

  it("a page beyond the total normalizes to the last valid page", () => {
    expect(getAssessmentPagination(99, 10, 37)).toEqual({
      page: 4,
      totalPages: 4,
      skip: 30,
      take: 10,
    });
  });

  it("uses the configured page size", () => {
    expect(getAssessmentPagination(1, ASSESSMENTS_PAGE_SIZE, 25)).toMatchObject({
      page: 1,
      totalPages: 3,
      skip: 0,
      take: ASSESSMENTS_PAGE_SIZE,
    });
  });
});

/* --------------------------------------------------------------------------
 * buildAssessmentListHref — URL preservation (requirement 64).
 * ------------------------------------------------------------------------ */

describe("buildAssessmentListHref", () => {
  it("returns the base route when nothing is set", () => {
    expect(buildAssessmentListHref({})).toBe("/admin/assessments");
  });

  it("omits default values (newest sort, page 1)", () => {
    expect(buildAssessmentListHref({ q: "ayu", sort: "newest", page: 1 })).toBe(
      "/admin/assessments?q=ayu",
    );
  });

  it("preserves q, major, concentration, sort and page together", () => {
    expect(
      buildAssessmentListHref({
        q: "ayu",
        major: "INFORMATICS",
        concentration: "AI",
        sort: "score_desc",
        page: 3,
      }),
    ).toBe(
      "/admin/assessments?q=ayu&major=INFORMATICS&concentration=AI&sort=score_desc&page=3",
    );
  });

  it("encodes special characters in the search term", () => {
    expect(buildAssessmentListHref({ q: "ayu & dewi" })).toBe(
      "/admin/assessments?q=ayu+%26+dewi",
    );
  });
});
