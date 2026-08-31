import { describe, expect, it } from "vitest";

import {
  ASSESSMENTS_OVER_TIME_DAYS,
  buildDailyBuckets,
  calculatePercentage,
  determineMostRecommended,
  fillZeroCounts,
  formatAverageSuitability,
  formatDashboardDate,
  formatShortDate,
  getAssessmentsOverTimePeriod,
  getBusiestDay,
  wrapLabel,
} from "@/lib/admin/dashboard-utils";

/* --------------------------------------------------------------------------
 * fillZeroCounts — missing categories become 0 (STEP 10 requirement: a
 * concentration with no recommendations must still be representable as 0).
 * ------------------------------------------------------------------------ */

describe("fillZeroCounts", () => {
  it("fills Informatics missing concentrations with 0 while preserving counts", () => {
    const result = fillZeroCounts({ AI: 3, IOT: 1 }, "INFORMATICS");

    expect(result).toEqual([
      { concentration: "CYBER_SECURITY", name: "Cyber Security", count: 0 },
      { concentration: "IOT", name: "Internet of Things (IoT)", count: 1 },
      { concentration: "AI", name: "Artificial Intelligence (AI)", count: 3 },
      {
        concentration: "AI_HEALTHCARE",
        name: "Artificial Intelligence (AI) in Healthcare",
        count: 0,
      },
      { concentration: "GAME_DEVELOPMENT", name: "Game Development", count: 0 },
      { concentration: "DEVOPS", name: "DevOps", count: 0 },
    ]);
  });

  it("fills Information Systems missing concentrations with 0", () => {
    const result = fillZeroCounts({ DATA_SCIENCE: 2 }, "INFORMATION_SYSTEMS");

    expect(result).toEqual([
      { concentration: "DATA_SCIENCE", name: "Data Science", count: 2 },
      {
        concentration: "ERP",
        name: "Enterprise Resource Planning (ERP)",
        count: 0,
      },
    ]);
  });

  it("returns the full zero set when the database has no counts", () => {
    const result = fillZeroCounts({}, "INFORMATICS");
    expect(result).toHaveLength(6);
    expect(result.every((row) => row.count === 0)).toBe(true);
  });
});

/* --------------------------------------------------------------------------
 * calculatePercentage
 * ------------------------------------------------------------------------ */

describe("calculatePercentage", () => {
  it("computes the share rounded to one decimal", () => {
    expect(calculatePercentage(42, 60)).toBe(70);
    expect(calculatePercentage(18, 60)).toBe(30);
    expect(calculatePercentage(1, 3)).toBe(33.3);
  });

  it("returns null when the total is zero or invalid (no division by zero)", () => {
    expect(calculatePercentage(5, 0)).toBeNull();
    expect(calculatePercentage(5, -3)).toBeNull();
    expect(calculatePercentage(Number.NaN, 10)).toBeNull();
    expect(calculatePercentage(5, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

/* --------------------------------------------------------------------------
 * determineMostRecommended — deterministic ordering + explicit ties
 * ------------------------------------------------------------------------ */

describe("determineMostRecommended", () => {
  it("returns the single most recommended concentration", () => {
    const result = determineMostRecommended({ AI: 5, IOT: 2, CYBER_SECURITY: 1 });

    expect(result).toEqual({
      concentrations: ["AI"],
      count: 5,
      tied: false,
    });
  });

  it("returns all tied top concentrations with a deterministic order", () => {
    const result = determineMostRecommended({ AI: 4, DATA_SCIENCE: 4, IOT: 1 });

    expect(result?.concentrations).toEqual(["AI", "DATA_SCIENCE"]);
    expect(result?.count).toBe(4);
    expect(result?.tied).toBe(true);
  });

  it("orders tied concentrations by display label, not enum order", () => {
    // ERP and DEVOPS tie; display order is "DevOps" before "Enterprise Resource Planning (ERP)".
    const result = determineMostRecommended({ ERP: 3, DEVOPS: 3 });

    expect(result?.concentrations).toEqual(["DEVOPS", "ERP"]);
    expect(result?.tied).toBe(true);
  });

  it("returns null when no concentration was recommended", () => {
    expect(determineMostRecommended({})).toBeNull();
    expect(determineMostRecommended({ AI: 0, IOT: 0 })).toBeNull();
  });
});

/* --------------------------------------------------------------------------
 * formatAverageSuitability — never a fake 0.0% for an empty database
 * ------------------------------------------------------------------------ */

describe("formatAverageSuitability", () => {
  it("formats finite values with one decimal place", () => {
    expect(formatAverageSuitability(78.456)).toBe("78.5%");
    expect(formatAverageSuitability(0)).toBe("0.0%");
    expect(formatAverageSuitability(100)).toBe("100.0%");
  });

  it("renders No data when there are no assessments", () => {
    expect(formatAverageSuitability(null)).toBe("No data");
    expect(formatAverageSuitability(Number.NaN)).toBe("No data");
  });
});

/* --------------------------------------------------------------------------
 * Date helpers — UTC convention
 * ------------------------------------------------------------------------ */

describe("date helpers", () => {
  it("formats dashboard dates as 31 Aug 2026 (UTC)", () => {
    const date = new Date(Date.UTC(2026, 7, 31, 23, 59, 59));
    expect(formatDashboardDate(date)).toBe("31 Aug 2026");
  });

  it("formats short date keys as 12 Aug", () => {
    expect(formatShortDate("2026-08-12")).toBe("12 Aug");
    expect(formatShortDate("2026-01-05")).toBe("5 Jan");
  });

  it("wraps long concentration labels at word boundaries", () => {
    expect(wrapLabel("Artificial Intelligence (AI) in Healthcare")).toEqual([
      "Artificial",
      "Intelligence (AI) in",
      "Healthcare",
    ]);
    expect(wrapLabel("Enterprise Resource Planning (ERP)")).toEqual([
      "Enterprise Resource",
      "Planning (ERP)",
    ]);
    expect(wrapLabel("DevOps")).toEqual(["DevOps"]);
  });
});

/* --------------------------------------------------------------------------
 * Assessments-over-time period + daily bucketing
 * ------------------------------------------------------------------------ */

describe("getAssessmentsOverTimePeriod", () => {
  it("covers the last N calendar days ending today (UTC), exclusive end", () => {
    const now = new Date(Date.UTC(2026, 7, 31, 14, 30, 0));
    const { start, endExclusive } = getAssessmentsOverTimePeriod(now, 30);

    expect(start.toISOString()).toBe("2026-08-02T00:00:00.000Z");
    expect(endExclusive.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });
});

describe("buildDailyBuckets", () => {
  const now = new Date(Date.UTC(2026, 7, 31, 12, 0, 0));

  it("produces exactly one bucket per day with zero-fill", () => {
    const buckets = buildDailyBuckets([], now, 30);

    expect(buckets).toHaveLength(30);
    expect(buckets[0]).toEqual({ date: "2026-08-02", count: 0 });
    expect(buckets[29]).toEqual({ date: "2026-08-31", count: 0 });
  });

  it("groups completedAt timestamps by UTC date", () => {
    const buckets = buildDailyBuckets(
      [
        new Date(Date.UTC(2026, 7, 12, 23, 59, 0)),
        new Date(Date.UTC(2026, 7, 12, 0, 0, 0)),
        new Date(Date.UTC(2026, 7, 31, 8, 0, 0)),
      ],
      now,
      30,
    );

    const aug12 = buckets.find((day) => day.date === "2026-08-12");
    const aug31 = buckets.find((day) => day.date === "2026-08-31");

    expect(aug12?.count).toBe(2);
    expect(aug31?.count).toBe(1);
    expect(buckets.reduce((sum, day) => sum + day.count, 0)).toBe(3);
  });
});

describe("getBusiestDay", () => {
  it("returns the day with the highest count", () => {
    const data = [
      { date: "2026-08-10", count: 1 },
      { date: "2026-08-11", count: 7 },
      { date: "2026-08-12", count: 3 },
    ];
    expect(getBusiestDay(data)).toEqual({ date: "2026-08-11", count: 7 });
  });

  it("returns null when there are no completed assessments", () => {
    const data = [
      { date: "2026-08-10", count: 0 },
      { date: "2026-08-11", count: 0 },
    ];
    expect(getBusiestDay(data)).toBeNull();
  });
});

/* Ensure the constant stays aligned with the default used by the helpers. */
describe("ASSESSMENTS_OVER_TIME_DAYS", () => {
  it("defaults to a 30-day window", () => {
    expect(ASSESSMENTS_OVER_TIME_DAYS).toBe(30);
  });
});

