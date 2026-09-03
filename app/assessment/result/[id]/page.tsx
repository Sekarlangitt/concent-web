import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClearAssessmentSession } from "@/components/assessment/ClearAssessmentSession";
import { Card } from "@/components/ui/Card";
import { ConcentrationProgramCard } from "@/components/results/ConcentrationProgramCard";
import { ConcentrationScoreList } from "@/components/results/ConcentrationScoreList";
import { ScoreCalculationCard } from "@/components/results/ScoreCalculationCard";
import { RecommendationCard } from "@/components/results/RecommendationCard";
import { RecommendationExplanation } from "@/components/results/RecommendationExplanation";
import { ResultDisclaimer } from "@/components/results/ResultDisclaimer";
import { ResultLoadError } from "@/components/results/ResultLoadError";
import { StartNewAssessmentButton } from "@/components/results/StartNewAssessmentButton";
import { getMajorLabel } from "@/lib/major";
import { prisma } from "@/lib/prisma";
import { generateResultExplanation } from "@/lib/results/generate-explanation";
import { formatSuitabilityScore } from "@/lib/results/format-score";
import { validateStoredResult } from "@/lib/results/result-utils";
import {
  mapVersionRecordToShape,
} from "@/lib/questionnaires/load-version";
import { toScoreQuestionSet } from "@/lib/questionnaires/scoring";

export const metadata: Metadata = {
  title: "Concentration Recommendation | President University",
  description:
    "Your President University concentration recommendation, based on your questionnaire responses.",
};

/**
 * Student recommendation result page (STEP 8).
 *
 * The authoritative result is always loaded from PostgreSQL using the route
 * id — never from sessionStorage, query parameters, or any client state.
 * Refreshing the page and opening a direct result URL both work because the
 * database is the single source of truth after submission.
 *
 * Error handling:
 *  - Unknown/invalid id → notFound() → "Result Not Found" page.
 *  - Database failure or corrupt stored data (missing score rows, an
 *    incompatible recommended concentration) → a clean "could not be loaded
 *    completely" state, with the issue logged server-side.
 */
export default async function AssessmentResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let assessment;
  try {
    assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        concentrationScores: true,
        answers: true,
        questionnaireVersion: {
          include: {
            questions: {
              orderBy: { order: "asc" },
              include: {
                options: {
                  orderBy: { order: "asc" },
                  include: { weights: true },
                },
              },
            },
          },
        },
      },
    });
  } catch (error) {
    console.error("[assessment/result] database lookup failed:", error);
    return <ResultLoadError />;
  }

  if (!assessment) {
    notFound();
  }

  const validated = validateStoredResult({
    major: assessment.major,
    recommendedConcentration: assessment.recommendedConcentration,
    recommendedScore: assessment.recommendedScore,
    scores: assessment.concentrationScores.map((score) => ({
      concentration: score.concentration,
      normalizedScore: score.normalizedScore,
      rawScore: score.rawScore,
    })),
  });

  if (!validated) {
    console.error(
      "[assessment/result] stored result is inconsistent",
      {
        assessmentId: assessment.id,
        major: assessment.major,
        recommendedConcentration: assessment.recommendedConcentration,
        scoreRows: assessment.concentrationScores.length,
      },
    );
    return <ResultLoadError />;
  }

  // Observability only: the stored recommendedScore should equal the stored
  // normalized score of the recommended concentration. Both values are still
  // displayed exactly as stored — the database is authoritative and is never
  // silently recalculated.
  const recommendedRow = assessment.concentrationScores.find(
    (score) => score.concentration === validated.recommendedConcentration,
  );
  if (
    recommendedRow &&
    Math.abs(recommendedRow.normalizedScore - assessment.recommendedScore) > 0.001
  ) {
    console.warn(
      "[assessment/result] recommendedScore differs from the stored score row",
      {
        assessmentId: assessment.id,
        storedRecommendedScore: assessment.recommendedScore,
        scoreRowNormalizedScore: recommendedRow.normalizedScore,
      },
    );
  }

  const explanation = generateResultExplanation({
    major: validated.major,
    recommendedConcentration: validated.recommendedConcentration,
    recommendedScore: validated.recommendedScore,
    confidenceLabel: assessment.confidenceLabel,
    scores: validated.scores,
    answers: assessment.answers.map((answer) => ({
      questionId: answer.questionId,
      answerKey: answer.answerKey,
    })),
    questionSet: assessment.questionnaireVersion
      ? toScoreQuestionSet(mapVersionRecordToShape(assessment.questionnaireVersion))
      : null,
  });

  // Transparency data: rebuild every answer option's weight per question from
  // the locked questionnaire version the student actually answered.
  const breakdownQuestions = assessment.questionnaireVersion
    ? assessment.questionnaireVersion.questions.map((question) => ({
        id: question.id,
        order: question.order,
        text: question.text,
        options: question.options.map((option) => ({
          id: option.id,
          label: option.label,
          weights: option.weights.map((weight) => ({
            concentration: weight.concentration,
            weight: weight.weight,
          })),
        })),
      }))
    : null;
  const breakdownAnswers = assessment.answers.map((answer) => ({
    questionId: answer.questionId,
    answerKey: answer.answerKey,
  }));

  const completedDate = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(assessment.completedAt ?? assessment.createdAt);

  return (
    <>
      <ClearAssessmentSession />
      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <dl className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
          <div className="flex items-baseline gap-1.5">
            <dt className="font-medium text-slate-500">Student:</dt>
            <dd className="font-semibold text-slate-800">{assessment.fullName}</dd>
          </div>
          <span aria-hidden="true" className="text-slate-300">
            |
          </span>
          <div className="flex items-baseline gap-1.5">
            <dt className="font-medium text-slate-500">Major:</dt>
            <dd className="font-semibold text-slate-800">
              {getMajorLabel(validated.major)}
            </dd>
          </div>
          <span aria-hidden="true" className="text-slate-300">
            |
          </span>
          <div className="flex items-baseline gap-1.5">
            <dt className="font-medium text-slate-500">Assessment completed:</dt>
            <dd className="font-semibold text-slate-800">{completedDate}</dd>
          </div>
        </dl>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Your Concentration Recommendation
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">
          Based on your questionnaire responses, this concentration appears to
          be your strongest current fit.
        </p>

        <div className="mt-8 space-y-8">
          <RecommendationCard
            concentration={validated.recommendedConcentration}
            suitabilityScore={formatSuitabilityScore(validated.recommendedScore)}
            confidenceLabel={assessment.confidenceLabel}
          />

          <RecommendationExplanation explanation={explanation} />

          <ConcentrationScoreList
            scores={validated.scores}
            recommendedConcentration={validated.recommendedConcentration}
          />

          <ConcentrationProgramCard
            concentration={validated.recommendedConcentration}
          />

          <ScoreCalculationCard
            scores={validated.scores}
            recommendedConcentration={validated.recommendedConcentration}
            questions={breakdownQuestions}
            answers={breakdownAnswers}
          />

          <Card className="p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-brand-900">
              How to Interpret Your Scores
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base">
              Each score reflects how closely your questionnaire responses
              matched the interests and activities represented by that
              concentration. Scores are normalized to a 0–100 scale so
              concentrations can be compared fairly. A higher score means your
              responses aligned more strongly with the themes represented by
              that concentration — it is a measure of fit, not a prediction of
              success.
            </p>
          </Card>

          <ResultDisclaimer />

          <div className="flex justify-center pb-4">
            <StartNewAssessmentButton />
          </div>
        </div>
      </section>
    </>
  );
}

