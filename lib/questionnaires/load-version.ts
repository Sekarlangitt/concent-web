import type { Concentration } from "@/data/concentrations";
import type {
  QuestionOptionShape,
  QuestionShape,
  QuestionnaireVersionShape,
} from "@/lib/questionnaires/types";

/**
 * Maps a Prisma QuestionnaireVersion record (with questions, options, and
 * weights loaded) into the plain, framework-neutral QuestionnaireVersionShape
 * used by validation, scoring, serialization, and the admin UI.
 *
 * Keep this mapping in one place so the admin pages, student endpoints, and
 * scoring pipeline all interpret the database identically.
 */

export type VersionRecordWithRelations = {
  id: string;
  major: QuestionnaireVersionShape["major"];
  versionNumber: number;
  status: QuestionnaireVersionShape["status"];
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  questions: Array<{
    id: string;
    order: number;
    type: QuestionShape["type"];
    text: string;
    helpText: string | null;
    category: string | null;
    isRequired: boolean;
    options: Array<{
      id: string;
      order: number;
      label: string;
      numericValue: number | null;
      weights: Array<{
        concentration: Concentration;
        weight: number;
      }>;
    }>;
  }>;
};

/** The Prisma include used by every version loader. */
export const VERSION_INCLUDE = {
  questions: {
    orderBy: { order: "asc" as const },
    include: {
      options: {
        orderBy: { order: "asc" as const },
        include: { weights: true },
      },
    },
  },
};

function mapOption(option: VersionRecordWithRelations["questions"][number]["options"][number]): QuestionOptionShape {
  const weights: Partial<Record<Concentration, number>> = {};
  for (const weight of option.weights) {
    weights[weight.concentration] = weight.weight;
  }
  return {
    id: option.id,
    order: option.order,
    label: option.label,
    numericValue: option.numericValue,
    weights,
  };
}

export function mapVersionRecordToShape(
  record: VersionRecordWithRelations,
): QuestionnaireVersionShape {
  const questions: QuestionShape[] = record.questions
    .map((question) => ({
      id: question.id,
      order: question.order,
      type: question.type,
      text: question.text,
      helpText: question.helpText,
      category: question.category,
      isRequired: question.isRequired,
      options: question.options.map(mapOption),
    }))
    .sort((a, b) => a.order - b.order);

  return {
    id: record.id,
    major: record.major,
    versionNumber: record.versionNumber,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    publishedAt: record.publishedAt,
    questions,
  };
}
