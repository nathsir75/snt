CREATE TABLE "BatchMaterial" (
  "id" SERIAL NOT NULL,
  "batchId" INTEGER NOT NULL,
  "branchId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "materialType" TEXT NOT NULL,
  "fileUrl" TEXT,
  "externalUrl" TEXT,
  "mediaAssetId" INTEGER,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BatchMaterial_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BatchMaterial"
ADD CONSTRAINT "BatchMaterial_batchId_fkey"
FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BatchMaterial"
ADD CONSTRAINT "BatchMaterial_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BatchMaterial"
ADD CONSTRAINT "BatchMaterial_mediaAssetId_fkey"
FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BatchMaterial"
ADD CONSTRAINT "BatchMaterial_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "BatchMaterial_batchId_isPublished_idx" ON "BatchMaterial"("batchId", "isPublished");
CREATE INDEX "BatchMaterial_branchId_idx" ON "BatchMaterial"("branchId");
CREATE INDEX "BatchMaterial_createdByUserId_idx" ON "BatchMaterial"("createdByUserId");
