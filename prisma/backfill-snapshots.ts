/**
 * One-time legacy backfill for historical assessments.
 *
 * This script makes pre-versioning assessments readable without depending on
 * the (soon removed) hardcoded question bank:
 *
 *  1. For every AssessmentAnswer that has no `questionSnapshot`:
 *     resolve the stored (questionId, answerKey) against the LEGACY question
 *     bank (data/publicQuestions.ts) and store the question text / option
 *     label as snapshots.
 *  2. For every Assessment that has no `questionnaireVersionId`:
 *     point it at the seeded PUBLISHED Version 1 of its major (the version
 *     created by prisma/seed-questionnaires.ts) so the record participates in
 *     the version model.
 *
 * Idempotent and non-destructive: rows that already have snapshots / versions
 * are skipped. Run once after the questionnaire seed:
 *
 *   npx tsx prisma/backfill-snapshots.ts
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { informaticsPublicQuestions } from "../data/publicQuestions";
import { informationSystemsPublicQuestions } from "../data/publicQuestions";
import { PrismaClient } from "../lib/generated/prisma/client";

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
    // Build legacy resolution maps (question id → { text, option label }).
    const legacyQuestions = new Map<
      string,
      { text: string; options: Map<string, string> }
    >();
    for (const question of [...informaticsPublicQuestions, ...informationSystemsPublicQuestions]) {
      legacyQuestions.set(question.id, {
        text: question.text,
        options: new Map(question.options.map((option) => [option.id, option.label])),
      });
    }

    // 1. Snapshot backfill for legacy answers.
    const legacyAnswers = await prisma.assessmentAnswer.findMany({
      where: { questionSnapshot: null },
      select: { id: true, questionId: true, answerKey: true },
    });

    let snapshotted = 0;
    let unresolved = 0;
    for (const answer of legacyAnswers) {
      const question = legacyQuestions.get(answer.questionId);
      const questionSnapshot = question?.text ?? null;
      const answerSnapshot = question?.options.get(answer.answerKey) ?? null;
      if (!questionSnapshot || !answerSnapshot) {
        unresolved += 1;
        continue;
      }
      await prisma.assessmentAnswer.update({
        where: { id: answer.id },
        data: { questionSnapshot, answerSnapshot },
      });
      snapshotted += 1;
    }

    // 2. Version backfill for legacy assessments.
    const legacyAssessments = await prisma.assessment.findMany({
      where: { questionnaireVersionId: null },
      select: { id: true, major: true },
    });

    let versionLinked = 0;
    const versionByMajor = new Map<string, string>();
    for (const assessment of legacyAssessments) {
      let versionId = versionByMajor.get(assessment.major);
      if (!versionId) {
        const version = await prisma.questionnaireVersion.findFirst({
          where: { major: assessment.major, status: "PUBLISHED" },
          select: { id: true },
          orderBy: { publishedAt: "desc" },
        });
        versionId = version?.id ?? "";
        versionByMajor.set(assessment.major, versionId);
      }
      if (!versionId) {
        continue;
      }
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: { questionnaireVersionId: versionId },
      });
      versionLinked += 1;
    }

    console.log(
      `[backfill] snapshots written: ${snapshotted} (unresolved: ${unresolved}); assessments linked to a version: ${versionLinked}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[backfill] failed:", error);
  process.exit(1);
});
