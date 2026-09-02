import type { Concentration } from "@/data/concentrations";
import type { QuestionType } from "@/data/questionTypes";
import type { Major } from "@/lib/major";

/**
 * Database-shaped questionnaire types (shared between admin and student
 * services, the scoring pipeline, and validation).
 *
 * These types mirror the Prisma models (QuestionnaireVersion → Question →
 * QuestionOption → QuestionOptionWeight) after they have been loaded with
 * their relations. Keeping them explicit means pure functions (validation,
 * scoring, serialization) never depend on Prisma-generated types, which keeps
 * them unit-testable and framework-neutral.
 */

export type QuestionnaireStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type QuestionOptionShape = {
  id: string;
  order: number;
  label: string;
  numericValue: number | null;
  /** Only concentrations belonging to the question's major may appear. */
  weights: Partial<Record<Concentration, number>>;
};

export type QuestionShape = {
  id: string;
  order: number;
  type: QuestionType;
  text: string;
  helpText: string | null;
  category: string | null;
  isRequired: boolean;
  options: QuestionOptionShape[];
};

export type QuestionnaireVersionShape = {
  id: string;
  major: Major;
  versionNumber: number;
  status: QuestionnaireStatus;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  questions: QuestionShape[];
};

/** The slice of a question the student UI may receive (never weights). */
export type StudentQuestionOption = {
  id: string;
  label: string;
};

export type StudentQuestion = {
  id: string;
  type: QuestionType;
  text: string;
  category?: string;
  helpText?: string | null;
  options: readonly StudentQuestionOption[];
};
