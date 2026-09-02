import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { QuestionEditor } from "@/components/admin/questions/QuestionEditor";
import { CONCENTRATIONS_BY_MAJOR } from "@/data/concentrations";
import { getQuestionDetail } from "@/lib/questionnaires/admin-questionnaire";
import { requireAdmin } from "@/lib/auth/admin";
import { getMajorLabel } from "@/lib/major";

export const metadata: Metadata = {
  title: "Edit Question | President University",
  description: "Edit a question, its options, and its scoring weights.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/questions/[versionId]/questions/[questionId]/edit — edit one
 * question inside a DRAFT version. Published/archived versions are rejected.
 */
export default async function AdminEditQuestionPage({
  params,
}: {
  params: Promise<{ versionId: string; questionId: string }>;
}) {
  await requireAdmin();
  const { versionId, questionId } = await params;

  const detail = await getQuestionDetail(questionId);
  if (!detail) {
    notFound();
  }
  const { question, version } = detail;
  if (question.questionnaireVersionId !== versionId) {
    notFound();
  }
  if (version.status !== "DRAFT") {
    redirect(`/admin/questions/${versionId}`);
  }

  const optionWeights = question.options.map((option) => {
    const weights: Partial<Record<string, number>> = {};
    for (const weight of option.weights) {
      weights[weight.concentration] = weight.weight;
    }
    return {
      id: option.id,
      label: option.label,
      weights,
    };
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">
          {getMajorLabel(version.major)} — Version {version.versionNumber}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Edit Question {question.order}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Changes apply only to this draft. Published versions are never
          modified.
        </p>
      </header>

      <QuestionEditor
        versionId={versionId}
        questionId={question.id}
        initialQuestion={{
          id: question.id,
          type: question.type,
          text: question.text,
          helpText: question.helpText,
          options: optionWeights,
        }}
        concentrations={CONCENTRATIONS_BY_MAJOR[version.major]}
        cancelHref={`/admin/questions/${versionId}`}
      />
    </div>
  );
}
