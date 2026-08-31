"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getMajorLabel, QUESTIONS_PER_MAJOR, type Major } from "@/lib/major";
import type { AssessmentSession } from "@/lib/assessment-session";
import { StartOverButton } from "@/components/assessment/StartOverButton";

const INFORMATICS_TOPICS = [
  "Security",
  "Connected devices",
  "Intelligent systems",
  "Healthcare technology",
  "Interactive & immersive technology",
  "Software infrastructure",
] as const;

const INFORMATION_SYSTEMS_TOPICS = [
  "Data",
  "Analytics",
  "Business processes",
  "Enterprise systems",
  "Organizational problem solving",
] as const;

function getTopics(major: Major): readonly string[] {
  return major === "INFORMATICS"
    ? INFORMATICS_TOPICS
    : INFORMATION_SYSTEMS_TOPICS;
}

export function AssessmentIntroduction({
  session,
}: {
  session: AssessmentSession;
}) {
  const majorLabel = getMajorLabel(session.major);
  const topics = getTopics(session.major);
  const hasAnswers = Object.keys(session.answers ?? {}).length > 0;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <Card className="p-6 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">
          President University
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Concentration Assessment
        </h1>

        <dl className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500">Student</dt>
            <dd className="mt-1 text-base font-semibold text-slate-900">
              {session.fullName}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Major</dt>
            <dd className="mt-1 text-base font-semibold text-slate-900">
              {majorLabel}
            </dd>
          </div>
        </dl>

        <div className="mt-8 space-y-4 text-base leading-relaxed text-slate-700">
          <p>
            You will answer {QUESTIONS_PER_MAJOR} questions about your
            interests, preferences, and preferred ways of solving problems.
            Your responses will be used to identify the concentration that best
            matches your profile.
          </p>
          <p className="font-medium text-slate-800">
            There are no right or wrong answers. Choose the response that best
            represents you.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-5">
          <h2 className="text-sm font-semibold text-brand-900">
            What this questionnaire explores
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {topics.map((topic) => (
              <li
                key={topic}
                className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-800"
              >
                {topic}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            href="/assessment/questions"
            size="lg"
            className="w-full sm:w-auto"
          >
            Begin Questions
          </Button>
          <StartOverButton
            hasAnswers={hasAnswers}
            size="lg"
            className="w-full sm:w-auto"
          />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Your progress is saved in this browser session.
        </p>
      </Card>
    </section>
  );
}
