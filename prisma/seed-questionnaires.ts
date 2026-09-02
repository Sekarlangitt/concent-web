/**
 * Initial questionnaire seed — idempotent, non-destructive.
 *
 * Creates Version 1 (PUBLISHED) of the Informatics and Information Systems
 * questionnaires from the freshman-friendly question bank
 * (prisma/question-bank.ts) — questions, options, and weights.
 *
 * Production safety (requirement 95): the seed NEVER overwrites an existing
 * published questionnaire. If a PUBLISHED version already exists for a major,
 * that major is skipped. To re-seed intentionally, first archive/delete the
 * existing versions (documented in the README).
 *
 * Run with:
 *   npx tsx prisma/seed-questionnaires.ts
 * or as part of the full seed:
 *   npm run db:seed
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import type { Concentration } from "../data/concentrations";
import { PrismaClient } from "../lib/generated/prisma/client";
import { INITIAL_QUESTIONNAIRES } from "./question-bank";

async function main(): Promise<void> {
  // Use DIRECT_URL (session-mode pooler) for interactive transactions — the
  // transaction-mode pooler (DATABASE_URL) does not support them.
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DIRECT_URL is not set. Add your Supabase connection string to .env (see .env.example).",
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    let seeded = 0;
    let skipped = 0;

    for (const questionnaire of INITIAL_QUESTIONNAIRES) {
      const existingPublished = await prisma.questionnaireVersion.findFirst({
        where: { major: questionnaire.major, status: "PUBLISHED" },
        select: { id: true, versionNumber: true },
      });

      if (existingPublished) {
        console.log(
          `[seed-questionnaires] ${questionnaire.major}: Version ${existingPublished.versionNumber} is already published — skipping (never overwrites admin content).`,
        );
        skipped += 1;
        continue;
      }

      if (questionnaire.questions.length !== 20) {
        throw new Error(
          `Question bank for ${questionnaire.major} must contain exactly 20 questions (found ${questionnaire.questions.length}).`,
        );
      }

      // The pooler is slower than a local database, so give the interactive
      // transaction a generous timeout (default is 5s).
      await prisma.$transaction(
        async (tx) => {
        const version = await tx.questionnaireVersion.create({
          data: {
            major: questionnaire.major,
            versionNumber: questionnaire.versionNumber,
            status: "PUBLISHED",
            publishedAt: new Date(),
          },
          select: { id: true },
        });

        for (const [questionIndex, question] of questionnaire.questions.entries()) {
          const createdQuestion = await tx.question.create({
            data: {
              questionnaireVersionId: version.id,
              order: questionIndex + 1,
              type: question.type,
              text: question.text,
              helpText: question.helpText ?? null,
              category: question.category,
              isRequired: true,
            },
            select: { id: true },
          });

          for (const [optionIndex, option] of question.options.entries()) {
            const createdOption = await tx.questionOption.create({
              data: {
                questionId: createdQuestion.id,
                order: optionIndex + 1,
                label: option.label,
                numericValue: option.numericValue ?? null,
              },
              select: { id: true },
            });

            for (const [concentration, weight] of Object.entries(
              option.weights,
            )) {
              await tx.questionOptionWeight.create({
                data: {
                  questionOptionId: createdOption.id,
                  concentration: concentration as Concentration,
                  weight: weight as number,
                },
              });
            }
          }
        }

        const optionCount = questionnaire.questions.reduce(
          (sum, question) => sum + question.options.length,
          0,
        );
        console.log(
          `[seed-questionnaires] ${questionnaire.major}: created Version ${questionnaire.versionNumber} (PUBLISHED) with ${questionnaire.questions.length} questions and ${optionCount} options (weights included).`,
        );
        },
        { timeout: 120_000 },
      );

      seeded += 1;
    }

    console.log(
      `[seed-questionnaires] done — created ${seeded}, skipped ${skipped}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[seed-questionnaires] failed:", error);
  process.exit(1);
});
