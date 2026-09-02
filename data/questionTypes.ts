/**
 * Shared questionnaire architecture (STEP 4/5).
 *
 * Both majors' question configurations reuse these types so that a single
 * rendering engine, a single review screen, and generic scoring utilities
 * work for Informatics (INF_Q01…INF_Q20) and Information Systems
 * (IS_Q01…IS_Q20).
 *
 * The weight scale is identical for every major:
 *   0 = no meaningful relationship   1 = weak relationship
 *   2 = mild relationship            3 = moderate relationship
 *   4 = strong relationship          5 = very strong relationship
 */

/** Supported question types. Every renderer supports all five. */
export type QuestionType =
  | "LIKERT"
  | "AGREEMENT"
  | "MULTIPLE_CHOICE"
  | "SCENARIO"
  | "PRIORITY";

/**
 * Weights contributed by one answer, keyed by the concentrations that belong
 * to the question's major. An absent concentration means weight 0.
 */
export type QuestionnaireAnswerOption<ConcentrationId extends string> = {
  /** Stable option ID, e.g. "IS_Q01_A". */
  id: string;
  label: string;
  weights: Partial<Record<ConcentrationId, number>>;
};

export type QuestionnaireQuestion<
  ConcentrationId extends string,
  MajorId extends string,
> = {
  /** Stable question ID, e.g. "IS_Q01". */
  id: string;
  major: MajorId;
  type: QuestionType;
  text: string;
  options: readonly QuestionnaireAnswerOption<ConcentrationId>[];
  /** Optional topic bucket used later for recommendation explanations. */
  category?: string;
  /**
   * Optional high-value differentiator marker (1 = strongest). Used
   * sparingly; final tie-breaking logic is implemented in a later step.
   */
  tieBreakerPriority?: number;
};

/**
 * The renderable slice of a question. The UI never needs the scoring weights,
 * so this minimal structural type lets both majors' questions flow through the
 * same card/progress/navigation components.
 */
export type RenderableQuestionOption = {
  id: string;
  label: string;
};

export type RenderableQuestion = {
  id: string;
  type: QuestionType;
  text: string;
  category?: string;
  helpText?: string | null;
  options: readonly RenderableQuestionOption[];
};
