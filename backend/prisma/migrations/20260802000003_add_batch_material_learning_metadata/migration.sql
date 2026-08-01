ALTER TABLE "BatchMaterial"
ADD COLUMN "contentCategory" TEXT NOT NULL DEFAULT 'study_resource',
ADD COLUMN "lectureDate" TIMESTAMP(3);

CREATE INDEX "BatchMaterial_contentCategory_lectureDate_idx" ON "BatchMaterial"("contentCategory", "lectureDate");
