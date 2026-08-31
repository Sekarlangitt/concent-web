"use client";

import { Suspense } from "react";
import { AssessmentIntroduction } from "@/components/assessment/AssessmentIntroduction";
import { AssessmentQuestions } from "@/components/assessment/AssessmentQuestions";
import { AssessmentReview } from "@/components/assessment/AssessmentReview";
import { useAssessmentSession } from "@/components/assessment/use-assessment-session";

type AssessmentSessionGateProps = {
  variant: "introduction" | "questions" | "review";
};

/**
 * Guards the assessment routes. Requires a valid sessionStorage session;
 * otherwise the hook redirects to "/". Renders a lightweight loading state
 * while the session is being resolved.
 *
 * The questions component reads the URL's `edit` query parameter via
 * useSearchParams, so it is wrapped in a Suspense boundary (recommended for
 * statically prerendered pages); the gate and its loading state stay
 * prerenderable above the boundary.
 */
export function AssessmentSessionGate({ variant }: AssessmentSessionGateProps) {
  const { session, isReady } = useAssessmentSession();

  if (!isReady || !session) {
    return (
      <div
        role="status"
        className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4"
      >
        <span
          aria-hidden="true"
          className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700"
        />
        <p className="text-sm text-slate-500">Loading your assessment…</p>
      </div>
    );
  }

  if (variant === "questions") {
    return (
      <Suspense fallback={null}>
        <AssessmentQuestions session={session} />
      </Suspense>
    );
  }

  if (variant === "review") {
    return <AssessmentReview session={session} />;
  }

  return <AssessmentIntroduction session={session} />;
}
