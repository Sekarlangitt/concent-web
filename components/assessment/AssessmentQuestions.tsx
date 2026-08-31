"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { saveAssessmentSession } from "@/lib/assessment-session";
import type { AssessmentSession } from "@/lib/assessment-session";
import {
  clampQuestionIndex,
  getEditIndexFromParam,
  getQuestionsForMajor,
  getValidAnswersForMajor,
  isQuestionAnswered,
  type AnyQuestion,
} from "@/lib/questionnaire";
import { AssessmentNavigation } from "@/components/assessment/AssessmentNavigation";
import { AssessmentProgress } from "@/components/assessment/AssessmentProgress";
import { AssessmentStudentSummary } from "@/components/assessment/AssessmentStudentSummary";
import { QuestionRenderer } from "@/components/assessment/QuestionRenderer";
import { StartOverButton } from "@/components/assessment/StartOverButton";

const REQUIRED_ANSWER_MESSAGE = "Please select an answer before continuing.";

/**
 * One-question-at-a-time questionnaire flow shared by both majors.
 *
 * The question set is chosen from the student's major (Informatics →
 * INF_Q01…INF_Q20, Information Systems → IS_Q01…IS_Q20), so a student always
 * sees exactly "Question 1 of 20 … Question 20 of 20" — never a mixed or
 * 40-question assessment.
 *
 * Normal mode (no `edit` query parameter):
 *   Previous / Next / Review Answers navigation, answers persisted
 *   immediately on selection, and the current position saved on every move.
 *
 * Edit-from-review mode (`/assessment/questions?edit=N`):
 *   Opens directly on Question N with the existing answer still selected.
 *   Navigation collapses to a single primary "Save & Return to Review"
 *   action so the student is not forced through the remaining questions
 *   again. The URL query drives this mode — no separate session flag.
 *
 * Stored answers are always sanitized on restore: invalid option IDs and
 * any cross-major question keys are treated as unanswered and removed.
 *
 * No results are calculated or saved yet — that is a later step.
 */
export function AssessmentQuestions({ session }: { session: AssessmentSession }) {
  const router = useRouter();
  const questions = getQuestionsForMajor(session.major);

  // Defensive fallback: the session schema only allows the two official
  // majors, so an empty question set is unreachable in normal flows.
  if (questions.length === 0) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <Card className="p-6 text-center sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">
            President University
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Questionnaire Unavailable
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            We could not find a questionnaire for the selected major. Please
            start over.
          </p>
          <div className="mt-8">
            <Button href="/assessment" variant="secondary">
              Back to introduction
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  return <QuestionnaireFlow session={session} questions={questions} routerPush={router.push} />;
}

function QuestionnaireFlow({
  session,
  questions,
  routerPush,
}: {
  session: AssessmentSession;
  questions: readonly AnyQuestion[];
  routerPush: (href: string) => void;
}) {
  const total = questions.length;

  // Edit-from-review mode: /assessment/questions?edit=N (N is 1-based and
  // must be a valid question number). Any other or missing value means the
  // normal questionnaire flow.
  const searchParams = useSearchParams();
  const editIndex = getEditIndexFromParam(searchParams.get("edit"), total);
  const isEditMode = editIndex !== null;

  // Restore the session exactly once, sanitizing invalid / cross-major
  // answers and clamping the current question into the valid range 0…19.
  // In edit mode the URL query wins: the student lands directly on the
  // question they chose to edit.
  const [initialAnswers] = useState(() =>
    getValidAnswersForMajor(questions, session.answers ?? {}),
  );
  const [initialIndex] = useState(() => {
    if (isEditMode) {
      return editIndex as number;
    }
    return clampQuestionIndex(session.currentQuestion, total);
  });
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [error, setError] = useState<string | null>(null);

  const questionAreaRef = useRef<HTMLDivElement | null>(null);
  const questionHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const previousIndexRef = useRef(currentIndex);

  const currentQuestion = questions[currentIndex];
  const isLast = currentIndex === total - 1;

  /** Moves focus to the question heading without triggering another scroll. */
  function focusQuestionHeading() {
    questionHeadingRef.current?.focus({ preventScroll: true });
  }

  // One-time write-back: persist the sanitized answers and clamped index so
  // invalid/cross-major entries are removed from sessionStorage as well.
  useEffect(() => {
    saveAssessmentSession({
      ...session,
      answers: initialAnswers,
      currentQuestion: initialIndex,
    });
    // Runs only on mount; session/initial values are intentionally fixed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the student moves Previous/Next, make the new question visible and
  // move focus to its heading. Skips the initial render (the page already
  // starts at the top) and uses instant scrolling under reduced motion.
  useEffect(() => {
    const previous = previousIndexRef.current;
    previousIndexRef.current = currentIndex;
    if (previous === currentIndex) {
      return;
    }
    const element = questionAreaRef.current;
    if (!element) {
      return;
    }
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    focusQuestionHeading();
  }, [currentIndex]);

  // Edit-from-review mode: arrived at Question N from the review page, so
  // focus the question heading so keyboard/screen-reader users start there.
  useEffect(() => {
    if (!isEditMode) {
      return;
    }
    focusQuestionHeading();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(nextAnswers: Record<string, string>, nextIndex: number) {
    saveAssessmentSession({
      ...session,
      answers: nextAnswers,
      currentQuestion: nextIndex,
    });
  }

  function handleSelect(optionId: string) {
    const nextAnswers = { ...answers, [currentQuestion.id]: optionId };
    setAnswers(nextAnswers);
    persist(nextAnswers, currentIndex);
    if (error) {
      setError(null);
    }
  }

  function handlePrevious() {
    if (currentIndex === 0) {
      return;
    }
    const nextIndex = currentIndex - 1;
    setCurrentIndex(nextIndex);
    persist(answers, nextIndex);
    if (error) {
      setError(null);
    }
  }

  function handleNext() {
    if (!isQuestionAnswered(currentQuestion, answers)) {
      setError(REQUIRED_ANSWER_MESSAGE);
      return;
    }
    if (isLast) {
      persist(answers, currentIndex);
      routerPush("/assessment/review");
      return;
    }
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    persist(answers, nextIndex);
  }

  /** Edit-from-review mode: require an answer, persist, then return to Review. */
  function handleSaveReturn() {
    if (!isQuestionAnswered(currentQuestion, answers)) {
      setError(REQUIRED_ANSWER_MESSAGE);
      return;
    }
    persist(answers, currentIndex);
    routerPush("/assessment/review");
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Card className="p-5 sm:p-8">
        {/* Shared header row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">
            President University
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {isEditMode ? (
              <Button href="/assessment/review" variant="secondary" size="sm">
                Back to Review
              </Button>
            ) : (
              <Button href="/assessment" variant="secondary" size="sm">
                Back to introduction
              </Button>
            )}
            <StartOverButton
              hasAnswers={Object.keys(answers).length > 0}
              size="sm"
            />
          </div>
        </div>

        {/* Assessment heading */}
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Concentration Assessment
        </h1>
        <p className="mt-2 text-base leading-relaxed text-slate-600">
          {isEditMode
            ? "Editing your answer. Select a response, then choose “Save & Return to Review”."
            : "Answer based on your interests and preferred ways of working."}
        </p>

        {/* Compact student summary — intentionally not visually dominant */}
        <div className="mt-4">
          <AssessmentStudentSummary
            fullName={session.fullName}
            major={session.major}
          />
        </div>

        {/* Progress indicator */}
        <div className="mt-6">
          <AssessmentProgress
            currentQuestionIndex={currentIndex}
            totalQuestions={total}
          />
        </div>

        {/* Question card */}
        <div
          key={currentQuestion.id}
          ref={questionAreaRef}
          className="question-fade-in mt-7 scroll-mt-24 border-t border-slate-100 pt-6"
        >
          <QuestionRenderer
            question={currentQuestion}
            questionNumber={currentIndex + 1}
            selectedOptionId={answers[currentQuestion.id]}
            onSelect={handleSelect}
            headingRef={questionHeadingRef}
          />
        </div>

        {/* Previous / Next controls */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          {isEditMode ? (
            <AssessmentNavigation
              onPrevious={handlePrevious}
              onNext={handleSaveReturn}
              isFirst={currentIndex === 0}
              nextLabel="Save & Return to Review"
              errorMessage={error ?? undefined}
              primaryOnly
            />
          ) : (
            <AssessmentNavigation
              onPrevious={handlePrevious}
              onNext={handleNext}
              isFirst={currentIndex === 0}
              nextLabel={isLast ? "Review Answers" : "Next"}
              errorMessage={error ?? undefined}
            />
          )}
        </div>
      </Card>

      <p className="mt-4 text-center text-xs text-slate-400">
        Your progress is saved in this browser session.
      </p>
    </section>
  );
}

