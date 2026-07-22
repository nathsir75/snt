-- CreateEnum
CREATE TYPE "LiveSessionType" AS ENUM ('live', 'recorded');

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "youtubeVideoId" TEXT NOT NULL,
    "sessionType" "LiveSessionType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
