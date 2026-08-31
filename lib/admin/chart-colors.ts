/**
 * STEP 10 shared chart palette.
 *
 * Single source of truth for every dashboard chart so colors stay consistent
 * across renders and across chart types. All values are derived from the
 * President University brand palette defined in app/globals.css (brand = navy
 * blue, accent = red, slate = neutral) and are chosen for readable contrast on
 * white cards.
 *
 * Color semantics: colors are ONLY visual distinctions between categories —
 * they never encode meaning (no "blue = good", no "red = bad"). The red accent
 * tone is available for the President University brand identity but is not
 * used as a series color in analytics charts to avoid implying a judgment.
 */

export const CHART_COLORS = {
  /** Informatics series — President University brand navy blue. */
  informatics: "#2a4b8c",
  /** Information Systems series — neutral slate (visual distinction only). */
  informationSystems: "#64748b",
  /** Assessments-over-time line — brand blue. */
  timeline: "#2a4b8c",
  /** Subtle grid lines. */
  grid: "#e2e8f0",
  /** Axis tick text. */
  axis: "#475569",
  /** Hover highlight for bars. */
  cursor: "rgba(148, 163, 184, 0.18)",
} as const;

/**
 * Deterministic bar colors for concentration distributions. Bars are filled by
 * position (index), and the data arrays are always produced in canonical
 * CONCENTRATIONS_BY_MAJOR order, so every concentration keeps the same color
 * across renders and between charts.
 */
export const CONCENTRATION_BAR_COLORS: readonly string[] = [
  "#1d3974", // brand-700
  "#2a4b8c", // brand-600
  "#3a62a8", // brand-500
  "#5a83c4", // brand-400
  "#8aabda", // brand-300
  "#64748b", // slate-500 (neutral)
] as const;
