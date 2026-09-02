import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PreviewQuestionnaire } from "@/components/admin/questions/PreviewQuestionnaire";
import { Button } from "@/components/ui/Button";
import { CONCENTRATIONS_BY_MAJOR } from "@/data/concentrations";
import { getVersionDetail } from "@/lib/questionnaires/admin-questionnaire";
import { requireAdmin } from "@/lib/auth/admin";
import { getMajorLabel } from "@/lib/major";

export const metadata: Metadata = {
  title: "Preview Questionnaire | President University",
  description: "Preview a questionnaire version as students see it.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

/**
 * /admin/questions/[versionId]/preview — admin-only questionnaire preview.
 * The page is inside the protected route group, so students can never reach
 * it. The "Show Weights" toggle is only available here.
 */
export default async function AdminQuestionnairePreviewPage({
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

  const questions = version.questions.map((question) => ({
    id: question.id,
    order: question.order,
    type: question.type,
    text: question.text,
    helpText: question.helpText,
    options: [...question.options]
      .sort((a, b) => a.order - b.order)
      .map((option) => ({
        id: option.id,
        label: option.label,
        weights: option.weights,
      })),
  }));

  const backHref = version.status === "DRAFT"
    ? `/admin/questions/${versionId}`
    : `/admin/questions?major=${version.major}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">
            President University
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Preview — {getMajorLabel(version.major)} Version{" "}
            {version.versionNumber}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-semibold">
              {STATUS_LABELS[version.status]}
            </span>{" "}
            · {version.questions.length} questions
          </p>
        </div>
        <Button href={backHref} variant="secondary">
          ← Back
        </Button>
      </header>

      <PreviewQuestionnaire
        questions={questions}
        concentrations={CONCENTRATIONS_BY_MAJOR[version.major]}
      />
    </div>
  );
}
