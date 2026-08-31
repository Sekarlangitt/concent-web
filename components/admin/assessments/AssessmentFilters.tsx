"use client";

import Link from "next/link";
import { useState } from "react";

import { ADMIN_ASSESSMENTS_ROUTE } from "@/lib/auth/config";
import {
  CONCENTRATION_IDS,
  CONCENTRATIONS_BY_MAJOR,
  getConcentrationLabel,
  type Concentration,
} from "@/data/concentrations";
import { getMajorLabel, MAJOR_IDS, type Major } from "@/lib/major";
import { buildAssessmentListHref, type AssessmentListParams } from "@/lib/admin/assessment-query";

/**
 * STEP 11 assessment list filters (search + major + concentration + sort).
 *
 * A plain GET form, so filtering happens server-side (the URL is the state:
 * refreshable, shareable, back/forward friendly). The page keys this component
 * with the current query string so values always reflect the URL after a
 * navigation. The concentration options adapt to the selected major
 * client-side; the server re-validates everything on submit, so an
 * incompatible manual URL combination is also reset there.
 *
 * Submitting never includes `page`, which resets pagination to page 1 when the
 * search/filters/sort change. "Clear Filters" is a plain link back to the base
 * route.
 */

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "name_asc", label: "Student Name (A–Z)" },
  { value: "name_desc", label: "Student Name (Z–A)" },
  { value: "score_desc", label: "Highest Suitability" },
  { value: "score_asc", label: "Lowest Suitability" },
];

const CONTROL_CLASSES =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1";
const LABEL_CLASSES = "mb-1.5 block text-sm font-medium text-slate-800";

export function AssessmentFilters({ current }: { current: AssessmentListParams }) {
  const [major, setMajor] = useState(current.major ?? "");
  const [concentration, setConcentration] = useState(current.concentration ?? "");

  const availableConcentrations: readonly Concentration[] = major
    ? CONCENTRATIONS_BY_MAJOR[major as Major]
    : CONCENTRATION_IDS;

  const selectedConcentration = availableConcentrations.includes(
    concentration as Concentration,
  )
    ? concentration
    : "";

  return (
    <form
      action={ADMIN_ASSESSMENTS_ROUTE}
      method="GET"
      className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
    >
      <div>
        <label htmlFor="assessment-search" className={LABEL_CLASSES}>
          Search by student name
        </label>
        <input
          id="assessment-search"
          name="q"
          type="search"
          autoComplete="off"
          defaultValue={current.q ?? ""}
          placeholder="e.g. Ayu"
          className={CONTROL_CLASSES}
        />
      </div>

      <div>
        <label htmlFor="assessment-major" className={LABEL_CLASSES}>
          Major
        </label>
        <select
          id="assessment-major"
          name="major"
          value={major}
          onChange={(event) => {
            setMajor(event.target.value);
            setConcentration("");
          }}
          className={CONTROL_CLASSES}
        >
          <option value="">All Majors</option>
          {MAJOR_IDS.map((majorId) => (
            <option key={majorId} value={majorId}>
              {getMajorLabel(majorId)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="assessment-concentration" className={LABEL_CLASSES}>
          Concentration
        </label>
        <select
          id="assessment-concentration"
          name="concentration"
          value={selectedConcentration}
          onChange={(event) => setConcentration(event.target.value)}
          className={CONTROL_CLASSES}
        >
          <option value="">All Concentrations</option>
          {availableConcentrations.map((concentrationId) => (
            <option key={concentrationId} value={concentrationId}>
              {getConcentrationLabel(concentrationId)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="assessment-sort" className={LABEL_CLASSES}>
          Sort by
        </label>
        <select
          id="assessment-sort"
          name="sort"
          defaultValue={current.sort}
          className={CONTROL_CLASSES}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 active:bg-brand-900"
        >
          Search
        </button>
        <Link
          href={buildAssessmentListHref({})}
          className="focus-ring inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-brand-900 transition-colors hover:border-brand-300 hover:bg-brand-50"
        >
          Clear Filters
        </Link>
      </div>
    </form>
  );
}
