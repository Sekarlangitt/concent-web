-- CreateEnum
CREATE TYPE "QuestionnaireStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('LIKERT', 'AGREEMENT', 'MULTIPLE_CHOICE', 'SCENARIO', 'PRIORITY');

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "questionnaireVersionId" TEXT;

-- AlterTable
ALTER TABLE "AssessmentAnswer" ADD COLUMN     "answerSnapshot" TEXT,
ADD COLUMN     "optionId" TEXT,
ADD COLUMN     "questionSnapshot" TEXT;

-- CreateTable
CREATE TABLE "QuestionnaireVersion" (
    "id" TEXT NOT NULL,
    "major" "Major" NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "QuestionnaireStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "QuestionnaireVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "questionnaireVersionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "QuestionType" NOT NULL,
    "text" TEXT NOT NULL,
    "helpText" TEXT,
    "category" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "numericValue" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOptionWeight" (
    "id" TEXT NOT NULL,
    "questionOptionId" TEXT NOT NULL,
    "concentration" "Concentration" NOT NULL,
    "weight" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionOptionWeight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionnaireVersion_major_status_idx" ON "QuestionnaireVersion"("major", "status");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireVersion_major_versionNumber_key" ON "QuestionnaireVersion"("major", "versionNumber");

-- CreateIndex
CREATE INDEX "Question_questionnaireVersionId_idx" ON "Question"("questionnaireVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Question_questionnaireVersionId_order_key" ON "Question"("questionnaireVersionId", "order");

-- CreateIndex
CREATE INDEX "QuestionOption_questionId_idx" ON "QuestionOption"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionOption_questionId_order_key" ON "QuestionOption"("questionId", "order");

-- CreateIndex
CREATE INDEX "QuestionOptionWeight_questionOptionId_idx" ON "QuestionOptionWeight"("questionOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionOptionWeight_questionOptionId_concentration_key" ON "QuestionOptionWeight"("questionOptionId", "concentration");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_questionnaireVersionId_fkey" FOREIGN KEY ("questionnaireVersionId") REFERENCES "QuestionnaireVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOptionWeight" ADD CONSTRAINT "QuestionOptionWeight_questionOptionId_fkey" FOREIGN KEY ("questionOptionId") REFERENCES "QuestionOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_questionnaireVersionId_fkey" FOREIGN KEY ("questionnaireVersionId") REFERENCES "QuestionnaireVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
