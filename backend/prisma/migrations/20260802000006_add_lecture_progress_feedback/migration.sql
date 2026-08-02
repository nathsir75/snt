CREATE TABLE "LectureProgress" (
  "id" SERIAL NOT NULL,
  "materialId" INTEGER NOT NULL,
  "studentId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "batchId" INTEGER NOT NULL,
  "branchId" INTEGER NOT NULL,
  "eventType" TEXT NOT NULL,
  "positionSeconds" INTEGER NOT NULL DEFAULT 0,
  "durationSeconds" INTEGER,
  "percentComplete" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LectureProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LectureFeedback" (
  "id" SERIAL NOT NULL,
  "materialId" INTEGER NOT NULL,
  "studentId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "batchId" INTEGER NOT NULL,
  "branchId" INTEGER NOT NULL,
  "rating" INTEGER NOT NULL,
  "clarityStatus" TEXT NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LectureFeedback_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "LectureProgress" ADD CONSTRAINT "LectureProgress_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "BatchMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LectureProgress" ADD CONSTRAINT "LectureProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LectureProgress" ADD CONSTRAINT "LectureProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LectureProgress" ADD CONSTRAINT "LectureProgress_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LectureProgress" ADD CONSTRAINT "LectureProgress_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LectureFeedback" ADD CONSTRAINT "LectureFeedback_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "BatchMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LectureFeedback" ADD CONSTRAINT "LectureFeedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LectureFeedback" ADD CONSTRAINT "LectureFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LectureFeedback" ADD CONSTRAINT "LectureFeedback_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LectureFeedback" ADD CONSTRAINT "LectureFeedback_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "LectureFeedback_materialId_studentId_key" ON "LectureFeedback"("materialId", "studentId");
CREATE INDEX "LectureProgress_materialId_studentId_createdAt_idx" ON "LectureProgress"("materialId", "studentId", "createdAt");
CREATE INDEX "LectureProgress_studentId_createdAt_idx" ON "LectureProgress"("studentId", "createdAt");
CREATE INDEX "LectureProgress_batchId_materialId_idx" ON "LectureProgress"("batchId", "materialId");
CREATE INDEX "LectureFeedback_materialId_createdAt_idx" ON "LectureFeedback"("materialId", "createdAt");
CREATE INDEX "LectureFeedback_batchId_materialId_idx" ON "LectureFeedback"("batchId", "materialId");
CREATE INDEX "LectureFeedback_clarityStatus_idx" ON "LectureFeedback"("clarityStatus");
