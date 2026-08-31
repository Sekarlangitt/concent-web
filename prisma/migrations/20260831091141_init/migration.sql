-- CreateEnum
CREATE TYPE "Major" AS ENUM ('INFORMATICS', 'INFORMATION_SYSTEMS');

-- CreateEnum
CREATE TYPE "Concentration" AS ENUM ('CYBER_SECURITY', 'IOT', 'AI', 'AI_HEALTHCARE', 'GAME_DEVELOPMENT', 'DEVOPS', 'DATA_SCIENCE', 'ERP');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "major" "Major" NOT NULL,
    "recommendedConcentration" "Concentration" NOT NULL,
    "recommendedScore" DOUBLE PRECISION NOT NULL,
    "confidenceLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAnswer" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerKey" TEXT NOT NULL,
    "numericValue" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConcentrationScore" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "concentration" "Concentration" NOT NULL,
    "rawScore" DOUBLE PRECISION NOT NULL,
    "normalizedScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConcentrationScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "AssessmentAnswer_assessmentId_idx" ON "AssessmentAnswer"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAnswer_assessmentId_questionId_key" ON "AssessmentAnswer"("assessmentId", "questionId");

-- CreateIndex
CREATE INDEX "ConcentrationScore_assessmentId_idx" ON "ConcentrationScore"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ConcentrationScore_assessmentId_concentration_key" ON "ConcentrationScore"("assessmentId", "concentration");

-- AddForeignKey
ALTER TABLE "AssessmentAnswer" ADD CONSTRAINT "AssessmentAnswer_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConcentrationScore" ADD CONSTRAINT "ConcentrationScore_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
