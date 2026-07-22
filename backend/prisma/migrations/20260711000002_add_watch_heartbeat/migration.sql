-- CreateEnum
CREATE TYPE "PlaybackState" AS ENUM ('playing', 'paused');

-- CreateTable
CREATE TABLE "WatchHeartbeat" (
    "id" SERIAL NOT NULL,
    "liveSessionId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playbackState" "PlaybackState" NOT NULL,

    CONSTRAINT "WatchHeartbeat_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WatchHeartbeat" ADD CONSTRAINT "WatchHeartbeat_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchHeartbeat" ADD CONSTRAINT "WatchHeartbeat_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
