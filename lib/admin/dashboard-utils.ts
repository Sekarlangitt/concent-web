import {
  CONCENTRATIONS_BY_MAJOR,
  CONCENTRATION_IDS,
  getConcentrationLabel,
  type Concentration,
} from "@/data/concentrations";
import type { Major } from "@/lib/major";

/**
 * STEP 10 dashboard post-processing helpers.
 *
 * Everything in this module is deterministic and framework-neutral so it can
 * be unit-tested without Prisma or React. The database layer
 * (lib/admin/dashboard.ts) fetches raw counts; these helpers transform them
 * into the exact shapes the dashboard renders:
 *
 *  - `fillZeroCounts` fills missing concentration categories with 0 so a
 *    concentration with no recommendations is still representable in a chart.
 *  - `calculatePercentage` computes major shares safely (never divides by zero).
 *  - `determineMostRecommended` finds the top concentration(s) using a stable
 *    ordering and reports ties explicitly.
 *  - `formatAverageSuitability` renders the average recommended score (or "No
 *    data" for an empty database — never a fake "0.0%").
 *  - `buildDailyBuckets` / `getAssessmentsOverTimePeriod` implement the
 *    assessments-over-time timeline with a documented **UTC** convention.
 */

/** One row of a recommendation distribution (per major). */
export type RecommendationDatum = {
  concentration: Concentration;
  /** Human-readable concentration label (never the raw enum value). */
  name: string;
  count: number;
};

/** One row of the assessments-by-major distribution. */
export type MajorDistributionDatum = {
  name: string;
  count: number;
  /** Percentage share of the total, or null when there are zero assessments. */
  percentage: number | null;
};

/** One day of the assessments-over-time timeline. */
export type AssessmentsOverTimeDatum = {
  /** UTC calendar date, formatted as YYYY-MM-DD (the only date key used). */
  date: string;
  count: number;
};

/** Result of the most-recommended aggregation. */
export type MostRecommendedSummary = {
  /**
   * Every concentration sharing the top count, ordered by display label
   * (stable, deterministic — never database/insertion order). Length > 1
   * means the top spot is tied.
   */
  concentrations: Concentration[];
  count: number;
  tied: boolean;
};

/** Number of days covered by the assessments-over-time timeline. */
export const ASSESSMENTS_OVER_TIME_DAYS = 30;

/**
 * Fills a per-major concentration count map with the major's full expected
 * concentration set, in canonical order, each with a human-readable label.
 * Any concentration missing from the input becomes count 0. This is what
 * guarantees "Cyber Security: 0" still appears when only AI/IoT were ever
 * recommended.
 */
export function fillZeroCounts(
  counts: Partial<Record<Concentration, number>>,
  major: Major,
): RecommendationDatum[] {
  return CONCENTRATIONS_BY_MAJOR[major].map((concentration) => ({
    concentration,
    name: getConcentrationLabel(concentration),
    count: counts[concentration] ?? 0,
  }));
}

/**
 * Percentage share of `part` within `total`, rounded to one decimal place.
 * Returns null (never NaN/Infinity) when the total is not a positive finite
 * number — the dashboard then simply omits the percentage instead of showing
 * a misleading "0.0%".
 */
export function calculatePercentage(part: number, total: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
    return null;
  }
  return Math.round((part / total) * 1000) / 10;
}

/**
 * Determines which concentration(s) appear most often in a count map.
 *
 * The scan iterates the canonical CONCENTRATION_IDS order and the returned
 * array is sorted by display label, so results never depend on database row
 * order. Ties are preserved and flagged (`tied: true`) so the dashboard can
 * display all top concentrations honestly instead of silently picking one.
 * Returns null when every count is zero (no data yet).
 */
export function determineMostRecommended(
  counts: Partial<Record<Concentration, number>>,
): MostRecommendedSummary | null {
  let max = 0;
  const tops: Concentration[] = [];

  for (const concentration of CONCENTRATION_IDS) {
    const count = counts[concentration] ?? 0;
    if (count <= 0) {
      continue;
    }
    if (count > max) {
      max = count;
      tops.length = 0;
      tops.push(concentration);
    } else if (count === max) {
      tops.push(concentration);
    }
  }

  if (max === 0) {
    return null;
  }

  tops.sort((a, b) => getConcentrationLabel(a).localeCompare(getConcentrationLabel(b)));

  return { concentrations: tops, count: max, tied: tops.length > 1 };
}

/**
 * Formats the average recommended suitability score as a percentage with one
 * decimal place ("78.4%"). Null or non-finite input renders as "No data" so an
 * empty database never displays a misleading "0.0%".
 */
export function formatAverageSuitability(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "No data";
  }
  return `${(Math.round(value * 10) / 10).toFixed(1)}%`;
}

/**
 * Formats a Date as a readable dashboard date ("31 Aug 2026"). Uses UTC so the
 * rendered date always matches the UTC convention used for data bucketing,
 * regardless of the server's local timezone.
 */
export function formatDashboardDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Formats a UTC YYYY-MM-DD date key as a short axis label ("12 Aug").
 * Used for the assessments-over-time chart ticks.
 */
export function formatShortDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Wraps a long concentration label into several lines at word boundaries so
 * the horizontal-bar chart axis stays readable for names such as
 * "Artificial Intelligence (AI) in Healthcare". A single word longer than
 * `maxChars` is kept whole rather than split mid-word. With the default of 20
 * the longest label wraps into at most 3 lines, which fits the chart's tick
 * bands.
 */
export function wrapLabel(label: string, maxChars = 20): string[] {
  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || candidate.length <= maxChars) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) {
    lines.push(current);
  }

  return lines;
}

function toUtcDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Computes the inclusive period covered by the timeline: the last `days`
 * calendar days ending today (UTC), returned as an exclusive [start, end)
 * pair. Example for days=30 on 2026-08-31: [2026-08-02T00:00Z, 2026-09-01T00:00Z).
 */
export function getAssessmentsOverTimePeriod(
  now: Date,
  days: number = ASSESSMENTS_OVER_TIME_DAYS,
): { start: Date; endExclusive: Date } {
  const endExclusive = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  const start = new Date(endExclusive);
  start.setUTCDate(start.getUTCDate() - days);
  return { start, endExclusive };
}

/**
 * Buckets completedAt timestamps into the timeline's daily buckets (UTC).
 * Every day of the period is present — days with no completions are 0, so the
 * chart never shows gaps or missing categories. `now` is injected so the
 * helper stays deterministic and testable.
 */
export function buildDailyBuckets(
  completedDates: readonly Date[],
  now: Date,
  days: number = ASSESSMENTS_OVER_TIME_DAYS,
): AssessmentsOverTimeDatum[] {
  const { start, endExclusive } = getAssessmentsOverTimePeriod(now, days);

  const counts = new Map<string, number>();
  for (const date of completedDates) {
    const key = toUtcDateKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const buckets: AssessmentsOverTimeDatum[] = [];
  const cursor = new Date(start);
  while (cursor < endExclusive) {
    const key = toUtcDateKey(cursor);
    buckets.push({ date: key, count: counts.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return buckets;
}

/**
 * Returns the busiest day of a timeline (first one found in chronological
 * order when tied), or null when there is no completed assessment.
 */
export function getBusiestDay(
  data: readonly AssessmentsOverTimeDatum[],
): AssessmentsOverTimeDatum | null {
  let busiest: AssessmentsOverTimeDatum | null = null;
  for (const day of data) {
    if (day.count > 0 && (!busiest || day.count > busiest.count)) {
      busiest = day;
    }
  }
  return busiest;
}

