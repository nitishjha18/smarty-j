/*
  Warnings:

  - You are about to drop the `AiInterview` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AiInterviewQuestion` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AiInterview" DROP CONSTRAINT "AiInterview_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "AiInterviewQuestion" DROP CONSTRAINT "AiInterviewQuestion_aiInterviewId_fkey";

-- DropTable
DROP TABLE "AiInterview";

-- DropTable
DROP TABLE "AiInterviewQuestion";

-- CreateTable
CREATE TABLE "ResumeAnalysis" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "missingKeywords" TEXT NOT NULL,
    "strongestPoints" TEXT NOT NULL,
    "redFlags" TEXT NOT NULL,
    "recruiterTake" TEXT NOT NULL,
    "suggestions" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResumeAnalysis_applicationId_key" ON "ResumeAnalysis"("applicationId");

-- AddForeignKey
ALTER TABLE "ResumeAnalysis" ADD CONSTRAINT "ResumeAnalysis_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
