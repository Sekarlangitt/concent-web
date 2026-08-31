import type { Ref } from "react";
import type { RenderableQuestion } from "@/data/questionTypes";
import { OptionCard } from "@/components/assessment/OptionCard";

const CATEGORY_LABELS: Record<string, string> = {
  security: "Security",
  hardware: "Hardware",
  "machine-learning": "Machine Learning",
  healthcare: "Healthcare",
  "creative-development": "Creative Development",
  "immersive-tech": "Immersive Technology",
  infrastructure: "Infrastructure",
  "data-analysis": "Data Analysis",
  automation: "Automation",
  analytics: "Analytics",
  prediction: "Prediction",
  "data-preparation": "Data Preparation",
  experimentation: "Experimentation",
  visualization: "Visualization",
  "business-process": "Business Process",
  "enterprise-integration": "Enterprise Integration",
  "system-configuration": "System Configuration",
  operations: "Operations",
  "organizational-change": "Organizational Change",
};

/** Short per-type instruction shown above the answer options. */
const TYPE_HINTS: Record<RenderableQuestion["type"], string> = {
  LIKERT: "Rate your interest on a scale from 1 to 5.",
  AGREEMENT: "Choose how much you agree with the statement.",
  MULTIPLE_CHOICE: "Choose the option that best matches you.",
  SCENARIO: "Read the scenario, then choose the role that appeals to you most.",
  PRIORITY: "Rate how important this is on a scale from 1 to 5.",
};

/**
 * Scaled question types show their numeric value next to each option so the
 * numbers are always explained by a descriptive label (never bare digits).
 */
const NUMBERED_OPTION_TYPES = new Set<RenderableQuestion["type"]>([
  "LIKERT",
  "PRIORITY",
]);

type QuestionRendererProps = {
  question: RenderableQuestion;
  /** One-based question number, e.g. 3 for "Question 3". */
  questionNumber: number;
  selectedOptionId?: string;
  onSelect: (optionId: string) => void;
  /**
   * Forwarded to the question heading (h2). The questionnaire flow focuses
   * this heading when the student navigates to a new question or into edit
   * mode, so the heading carries tabIndex={-1} and no visible outline (it is
   * programmatically focusable only, never a keyboard tab stop).
   */
  headingRef?: Ref<HTMLHeadingElement>;
};

/**
 * Shared question renderer for every questionnaire question.
 *
 * One component renders both majors' questions (Informatics INF_Q01…INF_Q20
 * and Information Systems IS_Q01…IS_Q20). The only per-type differences are
 * the short instruction line and whether options get a leading number:
 *
 *   QuestionRenderer
 *     → LIKERT            (five levels, numbered, e.g. "1 — Not interested at all")
 *     → AGREEMENT         (five readable agreement levels, no bare digits)
 *     → MULTIPLE_CHOICE   (vertical cards for longer answer text)
 *     → SCENARIO          (reuses the multiple-choice card rendering)
 *     → PRIORITY          (five importance levels, numbered)
 *
 * Options are grouped in a <fieldset> with radio semantics provided by the
 * native radio inputs inside OptionCard. This avoids duplicating almost
 * identical markup for each type.
 */
export function QuestionRenderer({
  question,
  questionNumber,
  selectedOptionId,
  onSelect,
  headingRef,
}: QuestionRendererProps) {
  const categoryLabel = question.category
    ? CATEGORY_LABELS[question.category] ?? question.category
    : null;
  const hint = TYPE_HINTS[question.type];
  const numberOptions = NUMBERED_OPTION_TYPES.has(question.type);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-brand-800">
          Question {questionNumber}
        </span>
        {categoryLabel ? (
          <span className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-800">
            {categoryLabel}
          </span>
        ) : null}
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {question.type.replaceAll("_", " ")}
        </span>
      </div>

      <h2
        ref={headingRef}
        tabIndex={-1}
        className="focus:outline-none mt-3 text-lg font-semibold leading-snug tracking-tight text-slate-900 sm:text-xl"
      >
        {question.text}
      </h2>

      {hint ? (
        <p className="mt-2 text-sm text-slate-500">{hint}</p>
      ) : null}

      <fieldset className="mt-5">
        <legend className="sr-only">
          Answer options for question {questionNumber}
        </legend>
        <div className="flex flex-col gap-2.5">
          {question.options.map((option, index) => (
            <OptionCard
              key={option.id}
              optionId={option.id}
              name={question.id}
              label={
                numberOptions
                  ? `${index + 1} — ${option.label}`
                  : option.label
              }
              selected={selectedOptionId === option.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
