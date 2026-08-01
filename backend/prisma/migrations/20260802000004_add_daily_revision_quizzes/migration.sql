CREATE TABLE "DailyQuiz" (
  "id" SERIAL NOT NULL,
  "batchId" INTEGER NOT NULL,
  "branchId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "topic" TEXT,
  "lectureDate" TIMESTAMP(3),
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "closesAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 10,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "archivedAt" TIMESTAMP(3),
  "createdByUserId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyQuiz_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyQuizQuestion" (
  "id" SERIAL NOT NULL,
  "quizId" INTEGER NOT NULL,
  "prompt" TEXT NOT NULL,
  "questionType" TEXT NOT NULL DEFAULT 'mcq',
  "imageUrl" TEXT,
  "mediaAssetId" INTEGER,
  "explanation" TEXT,
  "points" INTEGER NOT NULL DEFAULT 1,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DailyQuizQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyQuizOption" (
  "id" SERIAL NOT NULL,
  "questionId" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "matchText" TEXT,
  "isCorrect" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DailyQuizOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyQuizAttempt" (
  "id" SERIAL NOT NULL,
  "quizId" INTEGER NOT NULL,
  "studentId" INTEGER NOT NULL,
  "branchId" INTEGER NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'in_progress',
  "score" INTEGER NOT NULL DEFAULT 0,
  "totalPoints" INTEGER NOT NULL DEFAULT 0,
  "questionOrder" JSONB NOT NULL,
  "optionOrder" JSONB NOT NULL,
  CONSTRAINT "DailyQuizAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyQuizAnswer" (
  "id" SERIAL NOT NULL,
  "attemptId" INTEGER NOT NULL,
  "questionId" INTEGER NOT NULL,
  "selectedOptionId" INTEGER,
  "answerJson" JSONB,
  "isCorrect" BOOLEAN NOT NULL DEFAULT false,
  "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DailyQuizAnswer_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DailyQuiz" ADD CONSTRAINT "DailyQuiz_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyQuiz" ADD CONSTRAINT "DailyQuiz_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyQuiz" ADD CONSTRAINT "DailyQuiz_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyQuizQuestion" ADD CONSTRAINT "DailyQuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "DailyQuiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyQuizQuestion" ADD CONSTRAINT "DailyQuizQuestion_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DailyQuizOption" ADD CONSTRAINT "DailyQuizOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "DailyQuizQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyQuizAttempt" ADD CONSTRAINT "DailyQuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "DailyQuiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyQuizAttempt" ADD CONSTRAINT "DailyQuizAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyQuizAttempt" ADD CONSTRAINT "DailyQuizAttempt_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyQuizAnswer" ADD CONSTRAINT "DailyQuizAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "DailyQuizAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyQuizAnswer" ADD CONSTRAINT "DailyQuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "DailyQuizQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyQuizAnswer" ADD CONSTRAINT "DailyQuizAnswer_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "DailyQuizOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "DailyQuiz_batchId_scheduledAt_idx" ON "DailyQuiz"("batchId", "scheduledAt");
CREATE INDEX "DailyQuiz_branchId_idx" ON "DailyQuiz"("branchId");
CREATE INDEX "DailyQuiz_createdByUserId_idx" ON "DailyQuiz"("createdByUserId");
CREATE INDEX "DailyQuizQuestion_questionType_idx" ON "DailyQuizQuestion"("questionType");
CREATE UNIQUE INDEX "DailyQuizAttempt_quizId_studentId_key" ON "DailyQuizAttempt"("quizId", "studentId");
CREATE INDEX "DailyQuizAttempt_studentId_startedAt_idx" ON "DailyQuizAttempt"("studentId", "startedAt");
CREATE UNIQUE INDEX "DailyQuizAnswer_attemptId_questionId_key" ON "DailyQuizAnswer"("attemptId", "questionId");
