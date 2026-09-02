import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { QuestionEditor } from "@/components/admin/questions/QuestionEditor";
import { CONCENTRATIONS_BY_MAJOR } from "@/data/concentrations";
import { getVersionDetail } from "@/lib/questionnaires/admin-questionnaire";
import { requireAdmin } from "@/lib/auth/admin";
import { getMajorLabel } from "@/lib/major";

export const metadata: Metadata = {
  title: "Add Question | President University",
  description: "Add a question to a questionnaire draft.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** /admin/questions/[versionId]/questions/new — add a question to a draft. */
export default async function AdminNewQuestionPage({
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
  if (version.status !== "DRAFT") {
    redirect(`/admin/questions/${versionId}`);
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">
          {getMajorLabel(version.major)} — Version {version.versionNumber}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Add Question
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Write the question, its answer options, and how strongly each answer
          should count toward each concentration.
        </p>
      </header>

      <QuestionEditor
        versionId={versionId}
        concentrations={CONCENTRATIONS_BY_MAJOR[version.major]}
        cancelHref={`/admin/questions/${versionId}`}
      />
    </div>
  );
}
