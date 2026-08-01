CREATE INDEX "DailyQuiz_scheduledAt_idx" ON "DailyQuiz"("scheduledAt");
CREATE INDEX "DailyQuiz_batchId_archivedAt_isPublished_idx" ON "DailyQuiz"("batchId", "archivedAt", "isPublished");
CREATE INDEX "DailyQuizAttempt_quizId_status_idx" ON "DailyQuizAttempt"("quizId", "status");
CREATE INDEX "DailyQuizAttempt_quizId_studentId_status_idx" ON "DailyQuizAttempt"("quizId", "studentId", "status");
CREATE INDEX "DailyQuizAttempt_branchId_startedAt_idx" ON "DailyQuizAttempt"("branchId", "startedAt");
CREATE INDEX "DailyQuizAnswer_questionId_idx" ON "DailyQuizAnswer"("questionId");
