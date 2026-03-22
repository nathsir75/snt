/*
  Warnings:

  - A unique constraint covering the columns `[subdomain]` on the table `Branch` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "subdomain" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "TeacherBatchAssignment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "batchId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherBatchAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchSettings" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "logoUrl" TEXT,
    "tagline" TEXT,
    "mapLink" TEXT,
    "socialLinks" JSONB NOT NULL DEFAULT '[]',
    "navItems" JSONB NOT NULL DEFAULT '[]',
    "theme" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherBatchAssignment_userId_batchId_key" ON "TeacherBatchAssignment"("userId", "batchId");

-- CreateIndex
CREATE UNIQUE INDEX "BranchSettings_branchId_key" ON "BranchSettings"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_subdomain_key" ON "Branch"("subdomain");

-- AddForeignKey
ALTER TABLE "TeacherBatchAssignment" ADD CONSTRAINT "TeacherBatchAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherBatchAssignment" ADD CONSTRAINT "TeacherBatchAssignment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherBatchAssignment" ADD CONSTRAINT "TeacherBatchAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchSettings" ADD CONSTRAINT "BranchSettings_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
