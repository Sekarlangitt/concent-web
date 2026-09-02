import {
  getPublicQuestionsForMajor,
} from "@/data/publicQuestions";
import type { QuestionType } from "@/data/questionTypes";
import type { Major } from "@/lib/major";

/**
 * Major-based questionnaire selection (STEP 5, hardened in STEP 12).
 *
 * The student picks only a major; the concentration is inferred later from
 * their answers.
 *
 * ARCHITECTURE NOTE (database-managed questionnaires): the production student
 * flow no longer uses this module to CHOOSE questions — the server locks the
 * currently published QuestionnaireVersion and the client renders the
 * questions stored in the assessment session. This module keeps:
 *
 *  - the pure question-set helpers (answer validation, completeness, index
 *    clamping) that operate on ANY question shape, including the DB-backed
 *    student questions in the session, and
 *  - `getQuestionsForMajor` as a LEGACY resolver (the pre-database question
 *    bank) used to backfill and display historical assessments that predate
 *    questionnaire versioning.
 *
 * SECURITY: the legacy public metadata contains no weights. DB-backed student
 * questions are serialized by the server without weights. Scoring weights are
 * never reachable from this module.
 */

/** One answer option in any client-renderable question (no weights). */
export type AnyQuestionOption = {
  id: string;
  label: string;
};

/**
 * A structural question type shared by legacy public questions and DB-backed
 * student questions. `major` is present on legacy questions only; helpers
 * never rely on it.
 */
export type AnyQuestion = {
  id: string;
  type: QuestionType;
  text: string;
  category?: string;
  major?: Major;
  options: readonly AnyQuestionOption[];
};

/**
 * LEGACY: returns the 20-question questionnaire for the student's major from
 * the pre-database question bank. Used only to resolve historical assessments
 * created before questionnaire versioning. The production student flow reads
 * the published version from the database instead.
 *
 * Fails safely: an unexpected major yields an empty array instead of crashing.
 */
export function getQuestionsForMajor(major: Major): readonly AnyQuestion[] {
  return getPublicQuestionsForMajor(major);
}

/**
 * Whether an option ID belongs to the given question (i.e. it is one of the
 * question's own option IDs). Used to reject malformed, invented, or
 * cross-version answer values.
 */
export function isOptionIdForQuestion(
  question: AnyQuestion,
  optionId: string,
): boolean {
  return question.options.some((option) => option.id === optionId);
}

/**
 * Resolves the human-readable label for the answer a student stored for a
 * question. Returns null when the question has no stored answer or the stored
 * option ID does not belong to the question (invalid/invented).
 */
export function getAnswerLabel(
  question: AnyQuestion,
  answers: Record<string, string>,
): string | null {
  const selectedOptionId = answers[question.id];
  if (!selectedOptionId) {
    return null;
  }
  const option = question.options.find(
    (candidate) => candidate.id === selectedOptionId,
  );
  return option ? option.label : null;
}

/**
 * Whether a question has a valid stored answer. This is the single rule the
 * questionnaire flow uses to decide whether the student may move forward.
 */
export function isQuestionAnswered(
  question: AnyQuestion,
  answers: Record<string, string>,
): boolean {
  return getAnswerLabel(question, answers) !== null;
}

/**
 * Clamps a possibly-corrupt question index into the valid range 0 … total-1.
 * Used when restoring a session so an out-of-range currentQuestion is
 * recovered gracefully instead of crashing or landing on a wrong question.
 */
export function clampQuestionIndex(
  index: number,
  totalQuestions: number,
): number {
  if (totalQuestions <= 0) {
    return 0;
  }
  return Math.min(Math.max(Math.floor(index), 0), totalQuestions - 1);
}

/**
 * Filters a raw answers map down to the answers that are valid for the given
 * question set (the student's current major).
 *
 * Two kinds of invalid entries are dropped so they are treated as unanswered:
 *
 * - An answer whose value is not a valid option ID of its question
 *   (e.g. `IS_Q04 → INVALID_OPTION`).
 * - An answer keyed by a question that does not belong to this major's set
 *   (e.g. an `INF_Qxx` entry left over inside an Information Systems session).
 *
 * This is the single sanitizer used when restoring a session, so major
 * switching and corrupted storage cannot leak answers across assessments.
 */
export function getValidAnswersForMajor(
  questions: readonly AnyQuestion[],
  answers: Record<string, string>,
): Record<string, string> {
  const valid: Record<string, string> = {};
  for (const question of questions) {
    const selectedOptionId = answers[question.id];
    if (selectedOptionId && isOptionIdForQuestion(question, selectedOptionId)) {
      valid[question.id] = selectedOptionId;
    }
  }
  return valid;
}

/**
 * Number of questions in the given set that have a valid answer: the stored
 * option ID exists and belongs to that question. Invalid or cross-major
 * entries are never counted.
 */
export function getAnsweredCount(
  questions: readonly AnyQuestion[],
  answers: Record<string, string>,
): number {
  let count = 0;
  for (const question of questions) {
    const selectedOptionId = answers[question.id];
    if (selectedOptionId && isOptionIdForQuestion(question, selectedOptionId)) {
      count += 1;
    }
  }
  return count;
}

/**
 * Index of the first question without a valid answer, or -1 when every
 * question in the set is answered. Used to send the student straight to the
 * first missing/invalid question.
 */
export function getFirstIncompleteIndex(
  questions: readonly AnyQuestion[],
  answers: Record<string, string>,
): number {
  return questions.findIndex((question) => {
    const selectedOptionId = answers[question.id];
    return !selectedOptionId || !isOptionIdForQuestion(question, selectedOptionId);
  });
}

/**
 * Parses the `edit` query parameter used by edit-from-review mode
 * (`/assessment/questions?edit=N`, where N is a 1-based question number).
 * Returns the zero-based question index, or null when the parameter is
 * missing, not an integer, or outside the valid question range.
 */
export function getEditIndexFromParam(
  editParam: string | null,
  totalQuestions: number,
): number | null {
  if (editParam === null) {
    return null;
  }
  const parsed = Number(editParam);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > totalQuestions) {
    return null;
  }
  return parsed - 1;
}

/**
 * Completeness validation for the review screen.
 *
 * A question counts as complete only when the session stores a selected option
 * ID that actually belongs to that question. This rejects malformed or
 * cross-major answer IDs (for example an Informatics answer accidentally
 * retained inside an Information Systems session) instead of merely checking
 * that some string is present.
 */
export function getIncompleteQuestions(
  questions: readonly AnyQuestion[],
  answers: Record<string, string>,
): AnyQuestion[] {
  return questions.filter((question) => {
    const selectedOptionId = answers[question.id];
    if (!selectedOptionId) {
      return true;
    }
    return !isOptionIdForQuestion(question, selectedOptionId);
  });
}
