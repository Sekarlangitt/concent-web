"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { saveAssessmentSession } from "@/lib/assessment-session";
import type { AssessmentSession } from "@/lib/assessment-session";
import {
  getAnsweredCount,
  getAnswerLabel,
  getFirstIncompleteIndex,
  getIncompleteQuestions,
  getQuestionsForMajor,
  getValidAnswersForMajor,
} from "@/lib/questionnaire";
import {
  getCompletedAssessmentMarker,
  saveCompletedAssessmentMarker,
} from "@/lib/completed-assessment";
import {
  AssessmentSubmitError,
  submitAssessment,
  SUBMIT_NETWORK_ERROR_MESSAGE,
} from "@/lib/submit-assessment";
import { AssessmentStudentSummary } from "@/components/assessment/AssessmentStudentSummary";
import { StartOverButton } from "@/components/assessment/StartOverButton";

/** Shown for an answer ID that cannot be resolved to a real option. */
const UNRESOLVED_ANSWER_LABEL = "Answer needs to be completed";

const SUBMITTING_LABEL = "Calculating your recommendation…";

/**
 * Review screen for all 20 questions of the student's major (Informatics →
 * INF_Q01…INF_Q20, Information Systems → IS_Q01…IS_Q20).
 *
 * - Every stored answer ID is resolved through the trusted question
 *   configuration; a stored ID that does not belong to its question (invalid,
 *   invented, or cross-major) is shown as "Answer needs to be completed" and
 *   marks that question incomplete.
 * - Completeness is validated per question (never by counting keys), and an
 *   incomplete review shows "You still have X unanswered questions." with a
 *   "Complete Missing Questions" action that jumps to the first missing one.
 * - "Submit Assessment" sends ONLY { fullName, major, answers } to
 *   POST /api/assessments. The server validates, scores, normalizes, picks
 *   the recommendation, and stores everything in one transaction. Scores and
 *   weights are never calculated or accepted on the client.
 * - During submission the button is disabled ("Calculating your
 *   recommendation…"); double-clicks cannot create duplicate records.
 * - On success a small completion marker is saved and the student is taken to
 *   /assessment/result/[id]. On failure the message is friendly and the
 *   sessionStorage answers stay intact.
 */
export function AssessmentReview({ session }: { session: AssessmentSession }) {
  const router = useRouter();

  const questions = getQuestionsForMajor(session.major);
  const answers = session.answers ?? {};
  const total = questions.length;
  const answeredCount = getAnsweredCount(questions, answers);
  const incompleteQuestions = getIncompleteQuestions(questions, answers);
  const isComplete = incompleteQuestions.length === 0;
  const firstIncompleteIndex = getFirstIncompleteIndex(questions, answers);

  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "error">(
    "idle",
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submissionInFlightRef = useRef(false);

  // If this exact assessment was already submitted (browser Back after a
  // successful save), do not offer Submit again — show the result instead.
  // This component only renders client-side (the session gate resolves the
  // session before mounting it), so reading sessionStorage here is safe.
  const [completedAssessmentId] = useState<string | null>(() => {
    const marker = getCompletedAssessmentMarker();
    if (
      marker &&
      marker.fullName === session.fullName &&
      marker.major === session.major
    ) {
      return marker.assessmentId;
    }
    return null;
  });

  function editQuestion(index: number) {
    // Persist the position so a refresh after the edit param stays on the
    // same question, then open edit-from-review mode.
    saveAssessmentSession({ ...session, currentQuestion: index });
    router.push(`/assessment/questions?edit=${index + 1}`);
  }

  function completeMissingQuestions() {
    const index = firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0;
    editQuestion(index);
  }

  async function handleSubmit() {
    if (submissionInFlightRef.current) {
      return;
    }
    submissionInFlightRef.current = true;
    setSubmitState("submitting");
    setSubmitError(null);

    try {
      // Only valid answers for this major are sent; the server re-validates
      // everything anyway.
      const payload = {
        fullName: session.fullName,
        major: session.major,
        answers: getValidAnswersForMajor(questions, answers),
      };
      const response = await submitAssessment(payload);
      saveCompletedAssessmentMarker({
        fullName: session.fullName,
        major: session.major,
        assessmentId: response.assessmentId,
      });
      // Intentionally keep the in-flight guard set on success: navigation
      // unmounts this page, so no second submission can start.
      router.replace(`/assessment/result/${response.assessmentId}`);
    } catch (error) {
      submissionInFlightRef.current = false;
      setSubmitState("error");
      if (error instanceof AssessmentSubmitError) {
        setSubmitError(error.message);
      } else {
        setSubmitError(SUBMIT_NETWORK_ERROR_MESSAGE);
      }
    }
  }

  const unansweredCount = total - answeredCount;
  const isSubmitting = submitState === "submitting";

  if (completedAssessmentId) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Card className="p-6 text-center sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">
            President University
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Assessment Already Submitted
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-slate-700">
            This assessment has already been submitted successfully. Your result
            is available below.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              href={`/assessment/result/${completedAssessmentId}`}
              size="lg"
              className="w-full sm:flex-1"
            >
              View Your Result
            </Button>
            <StartOverButton
              hasAnswers={Object.keys(answers).length > 0}
              size="lg"
              className="w-full sm:flex-1"
            />
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Card className="p-5 sm:p-8">
        {/* Shared header row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">
            President University
          </p>
          <Button href="/assessment/questions" variant="secondary" size="sm">
            Back to questions
          </Button>
        </div>

        {/* Review heading */}
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Review Your Answers
        </h1>
        <p className="mt-2 text-base leading-relaxed text-slate-600">
          Check that every answer reflects your interests before submitting.
          Scoring happens securely on the server after you submit.
        </p>

        {/* Student summary */}
        <div className="mt-4">
          <AssessmentStudentSummary
            fullName={session.fullName}
            major={session.major}
            answeredCount={answeredCount}
            totalQuestions={total}
          />
        </div>

        {/* Incomplete banner */}
        {!isComplete ? (
          <div className="mt-5 rounded-xl border border-accent-200 bg-accent-50 p-4">
            <p className="text-sm font-semibold text-accent-800">
              You still have {unansweredCount} unanswered question
              {unansweredCount === 1 ? "" : "s"}.
            </p>
            <p className="mt-0.5 text-sm text-accent-700">
              {answeredCount} of {total} questions answered
            </p>
          </div>
        ) : null}

        {/* Review list — all questions in original questionnaire order */}
        <ol className="mt-6 divide-y divide-slate-200 border-t border-slate-200">
          {questions.map((question, index) => {
            const answerLabel = getAnswerLabel(question, answers);
            return (
              <li
                key={question.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    Question {index + 1}
                  </p>
                  <p className="mt-1 text-sm font-medium leading-snug text-slate-900">
                    {question.text}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Your answer:{" "}
                    {answerLabel ? (
                      <span className="font-semibold text-brand-800">
                        {answerLabel}
                      </span>
                    ) : (
                      <span className="font-medium text-accent-700">
                        {UNRESOLVED_ANSWER_LABEL}
                      </span>
                    )}
                  </p>
                </div>
                <div className="shrink-0 sm:pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => editQuestion(index)}
                    className="min-h-[44px] w-full sm:w-auto"
                  >
                    Edit
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Footer actions */}
        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row">
          {isComplete ? (
            <>
              <Button
                size="lg"
                className="w-full sm:flex-1"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? SUBMITTING_LABEL : "Submit Assessment"}
              </Button>
              <StartOverButton
                hasAnswers={Object.keys(answers).length > 0}
                size="lg"
                className="w-full sm:flex-1"
                disabled={isSubmitting}
              />
            </>
          ) : (
            <>
              <Button
                size="lg"
                className="w-full sm:flex-1"
                onClick={completeMissingQuestions}
              >
                Complete Missing Questions
              </Button>
              <StartOverButton
                hasAnswers={Object.keys(answers).length > 0}
                size="lg"
                className="w-full sm:flex-1"
                disabled={isSubmitting}
              />
            </>
          )}
        </div>

        {/* Submission status / error */}
        {isSubmitting ? (
          <div
            role="status"
            className="mt-5 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-sm text-slate-500"
          >
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700"
            />
            {SUBMITTING_LABEL}
          </div>
        ) : null}

        {submitState === "error" && submitError ? (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-accent-200 bg-accent-50 p-4"
          >
            <p className="text-sm font-medium text-accent-800">{submitError}</p>
          </div>
        ) : null}

        <p className="mt-6 text-center text-xs text-slate-400">
          Your progress is saved in this browser session.
        </p>
      </Card>
    </section>
  );
}
