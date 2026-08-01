ALTER TABLE "BatchMaterial"
ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "BatchMaterial_archivedAt_idx" ON "BatchMaterial"("archivedAt");
