ALTER TABLE "User"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "suspendedAt" TIMESTAMP(3);

CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "User_branchId_status_idx" ON "User"("branchId", "status");
