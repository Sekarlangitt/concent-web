import { CONCENTRATIONS_BY_MAJOR, type Concentration } from "@/data/concentrations";
import {
  scoreAssessment,
  type ScoreAssessmentInput,
} from "@/lib/scoring/score-assessment";
import type {
  AssessmentScoreResult,
  ScoreQuestionSet,
} from "@/lib/scoring/types";
import type {
  QuestionnaireVersionShape,
} from "@/lib/questionnaires/types";

/**
 * Database → scoring bridge.
 *
 * The pure scoring pipeline (lib/scoring/score-assessment.ts) works on plain,
 * framework-neutral question sets. This module converts a loaded
 * QuestionnaireVersion (questions + options + weights from PostgreSQL) into
 * that shape and exposes the authoritative score path for a locked version.
 *
 * It also builds the historical answer snapshots (question text / option
 * label) that are stored on AssessmentAnswer rows so historical records stay
 * readable even after future questionnaire versions change.
 */

/**
 * Converts a loaded questionnaire version into the pure scoring question set.
 * Concentrations come from the major metadata — never from the payload.
 */
export function toScoreQuestionSet(
  version: QuestionnaireVersionShape,
): ScoreQuestionSet {
  const concentrations = CONCENTRATIONS_BY_MAJOR[version.major];
  return {
    questions: [...version.questions]
      .sort((a, b) => a.order - b.order)
      .map((question) => ({
        id: question.id,
        type: question.type,
        text: question.text,
        category: question.category ?? undefined,
        options: [...question.options]
          .sort((a, b) => a.order - b.order)
          .map((option) => ({
            id: option.id,
            label: option.label,
            numericValue: option.numericValue,
            weights: option.weights,
          })),
      })),
    concentrations,
  };
}

/** Scores a locked questionnaire version. The version must already be loaded. */
export function scoreQuestionnaireVersion(input: {
  version: QuestionnaireVersionShape;
  answers: Record<string, string>;
}): AssessmentScoreResult {
  const questionSet = toScoreQuestionSet(input.version);
  const scoringInput: ScoreAssessmentInput = {
    major: input.version.major,
    answers: input.answers,
    questionSet,
  };
  return scoreAssessment(scoringInput);
}

/** One stored-answer snapshot row. */
export type AnswerSnapshot = {
  questionId: string;
  answerKey: string;
  optionId: string;
  numericValue: number | null;
  questionSnapshot: string;
  answerSnapshot: string;
};

/**
 * Builds the historical snapshot rows for a scored submission. Question text
 * and option labels are copied from the version the student actually answered
 * so later questionnaire edits can never alter historical records.
 */
export function buildAnswerSnapshots(
  version: QuestionnaireVersionShape,
  scored: AssessmentScoreResult,
): AnswerSnapshot[] {
  const questionById = new Map(
    version.questions.map((question) => [question.id, question]),
  );

  return scored.answers.map((answer) => {
    const question = questionById.get(answer.questionId);
    const option = question?.options.find(
      (candidate) => candidate.id === answer.answerKey,
    );
    return {
      questionId: answer.questionId,
      answerKey: answer.answerKey,
      optionId: answer.answerKey,
      numericValue: answer.numericValue,
      questionSnapshot: question?.text ?? "",
      answerSnapshot: option?.label ?? "",
    };
  });
}

export type { Concentration };
