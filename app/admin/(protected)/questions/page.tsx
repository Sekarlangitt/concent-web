import type { Metadata } from "next";
import Link from "next/link";

import { DeleteDraftButton } from "@/components/admin/questions/DeleteDraftButton";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  createDraftFromPublishedAction,
  createEmptyDraftAction,
} from "@/lib/admin/questionnaire-actions";
import {
  getVersionDetail,
  getVersionsForMajor,
} from "@/lib/questionnaires/admin-questionnaire";
import { validateQuestionnaireForPublish } from "@/lib/questionnaires/validation";
import { requireAdmin } from "@/lib/auth/admin";
import { getMajorLabel, type Major } from "@/lib/major";
import { QUESTIONS_PER_MAJOR } from "@/lib/major";

export const metadata: Metadata = {
  title: "Questionnaire Management | President University",
  description:
    "Manage the published and draft questionnaires and their scoring weights.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const MAJORS: readonly Major[] = ["INFORMATICS", "INFORMATION_SYSTEMS"];

/**
 * /admin/questions — questionnaire management landing page.
 *
 * Lets the admin switch between majors and see the current Published and
 * Draft versions. Drafts are created by cloning the published version, edited,
 * validated, previewed, and published — published versions are never edited
 * directly.
 */
export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const raw = await searchParams;
  const selected = Array.isArray(raw.major) ? raw.major[0] : raw.major;
  const major: Major =
    selected === "INFORMATION_SYSTEMS" ? "INFORMATION_SYSTEMS" : "INFORMATICS";

  const versions = await getVersionsForMajor(major);
  const published = versions.find((version) => version.status === "PUBLISHED");
  const draft = versions.find((version) => version.status === "DRAFT");
  const archived = versions.filter((version) => version.status === "ARCHIVED");

  let draftValidation: ReturnType<typeof validateQuestionnaireForPublish> | null =
    null;
  if (draft) {
    const detail = await getVersionDetail(draft.id);
    if (detail) {
      draftValidation = validateQuestionnaireForPublish(detail);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Questionnaire Management
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Questions, options, and scoring weights are stored in the database
          and versioned. Published questionnaires are immutable; edit a draft
          and publish it when ready.
        </p>
      </header>

      {/* Major switcher */}
      <nav aria-label="Major" className="flex gap-2">
        {MAJORS.map((candidate) => {
          const active = candidate === major;
          return (
            <Link
              key={candidate}
              href={`/admin/questions?major=${candidate}`}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "focus-ring inline-flex h-10 items-center justify-center rounded-lg border border-brand-700 bg-brand-700 px-5 text-sm font-semibold text-white"
                  : "focus-ring inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
              }
            >
              {getMajorLabel(candidate)}
            </Link>
          );
        })}
      </nav>

      {/* Published version */}
      <section aria-label="Published questionnaire">
        <h2 className="text-base font-semibold text-slate-900">Published</h2>
        <Card className="mt-3 p-5 sm:p-6">
          {published ? (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Version {published.versionNumber}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {published._count.questions} questions · Published{" "}
                  {published.publishedAt
                    ? new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                      }).format(published.publishedAt)
                    : "—"}
                </p>
                <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-500">
                  Students answer this version. It cannot be edited directly —
                  create a draft from it to make changes.
                </p>
              </div>
              <Button
                href={`/admin/questions/${published.id}/preview`}
                variant="secondary"
                size="sm"
              >
                Preview Published
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-slate-800">
                No published questionnaire for {getMajorLabel(major)}.
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Students will see a graceful “temporarily unavailable” message
                until a valid questionnaire is published.
              </p>
              {draft ? null : (
                <form action={createEmptyDraftAction} className="mt-4">
                  <input type="hidden" name="major" value={major} />
                  <Button type="submit" size="sm">
                    Create Empty Draft
                  </Button>
                </form>
              )}
            </div>
          )}
        </Card>
      </section>

      {/* Draft version */}
      <section aria-label="Draft questionnaire">
        <h2 className="text-base font-semibold text-slate-900">Draft</h2>
        <Card className="mt-3 p-5 sm:p-6">
          {draft ? (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Version {draft.versionNumber}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {draft._count.questions} question
                  {draft._count.questions === 1 ? "" : "s"} · Last updated{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                  }).format(draft.updatedAt)}
                </p>
                {draftValidation && !draftValidation.valid ? (
                  <p className="mt-2 rounded-lg border border-accent-200 bg-accent-50 px-3 py-2 text-xs font-medium text-accent-700">
                    {draftValidation.errors.length} validation{" "}
                    {draftValidation.errors.length === 1 ? "issue" : "issues"} —{" "}
                    {draftValidation.questionCount} /{" "}
                    {draftValidation.expectedQuestionCount} questions
                  </p>
                ) : null}
                {draftValidation && draftValidation.valid ? (
                  <p className="mt-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
                    Valid and ready to publish.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  href={`/admin/questions/${draft.id}`}
                  variant="primary"
                  size="sm"
                >
                  Edit Draft
                </Button>
                <Button
                  href={`/admin/questions/${draft.id}/preview`}
                  variant="secondary"
                  size="sm"
                >
                  Preview Draft
                </Button>
                <DeleteDraftButton versionId={draft.id} />
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-600">
                No draft in progress. Create a draft from the published version
                to start editing.
              </p>
              <form action={createDraftFromPublishedAction} className="mt-4">
                <input type="hidden" name="major" value={major} />
                <Button type="submit" size="sm">
                  Create Draft From Published
                </Button>
              </form>
            </div>
          )}
        </Card>
      </section>


      {/* Archived versions */}
      <section aria-label="Archived questionnaires">
        <h2 className="text-base font-semibold text-slate-900">
          Version History
        </h2>
        {archived.length > 0 ? (
          <Card className="mt-3 p-5 sm:p-6">
            <ul className="space-y-3">
              {archived.map((version) => (
                <li
                  key={version.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Version {version.versionNumber}
                      <span className="ml-2 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Archived
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {version._count.questions} questions
                    </p>
                  </div>
                  <Button
                    href={`/admin/questions/${version.id}/preview`}
                    variant="secondary"
                    size="sm"
                  >
                    Preview
                  </Button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              Archived versions stay read-only. Historical assessments keep
              referencing them so past results never change.
            </p>
          </Card>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No archived versions yet. Publishing a draft archives the previous
            published version.
          </p>
        )}
      </section>

      <p className="text-xs text-slate-400">
        Every published questionnaire must contain exactly{" "}
        {QUESTIONS_PER_MAJOR} questions with valid weights.
      </p>
    </div>
  );
}

