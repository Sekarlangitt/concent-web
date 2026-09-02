import type { StudentQuestion } from "@/lib/questionnaires/types";

/**
 * SAFE student question serialization (pure, framework-neutral).
 *
 * Converts a loaded questionnaire version's questions into the exact payload
 * the student browser receives: question id, type, text, category, help text,
 * and option ids/labels — NEVER scoring weights. The same shape is stored in
 * the assessment session so the whole attempt uses one locked version.
 */
export function serializeStudentQuestions(version: {
  questions: Array<{
    id: string;
    order: number;
    type: StudentQuestion["type"];
    text: string;
    helpText: string | null;
    category: string | null;
    options: Array<{
      id: string;
      order: number;
      label: string;
    }>;
  }>;
}): StudentQuestion[] {
  return [...version.questions]
    .sort((a, b) => a.order - b.order)
    .map((question) => ({
      id: question.id,
      type: question.type,
      text: question.text,
      category: question.category ?? undefined,
      helpText: question.helpText,
      options: [...question.options]
        .sort((a, b) => a.order - b.order)
        .map((option) => ({ id: option.id, label: option.label })),
    }));
}
