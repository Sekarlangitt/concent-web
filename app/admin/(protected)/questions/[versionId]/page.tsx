import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AddQuestionLink, QuestionList } from "@/components/admin/questions/QuestionList";
import { PublishQuestionnaireButton } from "@/components/admin/questions/PublishQuestionnaireButton";
import { QuestionnaireValidation } from "@/components/admin/questions/QuestionnaireValidation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getVersionDetail } from "@/lib/questionnaires/admin-questionnaire";
import { validateQuestionnaireForPublish } from "@/lib/questionnaires/validation";
import { requireAdmin } from "@/lib/auth/admin";
import { getMajorLabel } from "@/lib/major";

export const metadata: Metadata = {
  title: "Questionnaire Version | President University",
  description: "Edit, validate, and publish a questionnaire draft.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

/**
 * /admin/questions/[versionId] — one questionnaire version.
 *
 * DRAFT versions are fully editable (questions, options, weights, order) and
 * show the live validation panel + publish button. PUBLISHED / ARCHIVED
 * versions are strictly read-only.
 */
export default async function AdminQuestionnaireVersionPage({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  await requireAdmin();
  const { versionId } = await params;

  const version = await getVersionDetail(versionId);
  if (!version) {
    notFound();
  }

  const validation = validateQuestionnaireForPublish(version);
  const isDraft = version.status === "DRAFT";

  const rows = version.questions.map((question) => ({
    id: question.id,
    order: question.order,
    type: question.type,
    text: question.text,
    category: question.category,
    optionCount: question.options.length,
  }));

  const majorLabel = getMajorLabel(version.major);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">
            President University
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {majorLabel} — Version {version.versionNumber}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                isDraft
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-brand-200 bg-brand-50 text-brand-800"
              }`}
            >
              {STATUS_LABELS[version.status]}
            </span>
            <span className="text-xs text-slate-500">
              {version.questions.length} questions · Last updated{" "}
              {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                new Date(version.updatedAt ?? version.createdAt),
              )}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            href={`/admin/questions?major=${version.major}`}
            variant="secondary"
            size="sm"
          >
            ← Back to Questions
          </Button>
          <Button
            href={`/admin/questions/${versionId}/preview`}
            variant="secondary"
            size="sm"
          >
            Preview
          </Button>
        </div>
      </header>

      {!isDraft ? (
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-semibold text-brand-900">
            This version is read-only
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {version.status === "PUBLISHED"
              ? "Students are currently answering this questionnaire. To make changes, create a draft from the published version, edit the draft, then publish it."
              : "This archived version exists to preserve historical assessments. To make changes, create a draft from the current published version."}
          </p>
        </Card>
      ) : null}

      <QuestionnaireValidation validation={validation} />

      <section aria-labelledby="questions-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="questions-heading" className="text-base font-semibold text-slate-900">
              Questions ({version.questions.length})
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Exactly 20 questions are required before publishing.
            </p>
          </div>
          {isDraft ? <AddQuestionLink versionId={versionId} /> : null}
        </div>

        <div className="mt-4">
          <QuestionList
            versionId={versionId}
            questions={rows}
            editable={isDraft}
          />
        </div>
      </section>

      {isDraft ? (
        <section aria-label="Publish" className="border-t border-slate-200 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Publish this questionnaire
              </h2>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                Publishing validates the whole version and atomically archives
                the current published version. Existing assessment attempts
                keep using their original version.
              </p>
            </div>
            <PublishQuestionnaireButton
              versionId={versionId}
              disabled={!validation.valid}
              hasDraft
            />
          </div>
        </section>
      ) : (
        <Button
          href={`/admin/questions?major=${version.major}`}
          variant="secondary"
        >
          Back to Questions
        </Button>
      )}
    </div>
  );
}

