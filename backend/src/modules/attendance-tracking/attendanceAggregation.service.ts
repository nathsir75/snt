import prisma from '../../db/prisma';

export const MAX_HEARTBEAT_INTERVAL_SECONDS = 5 * 60;

export type HeartbeatRow = {
  liveSessionId: number;
  studentId: number;
  receivedAt: Date;
  playbackState: 'playing' | 'paused';
  liveSession: {
    durationMinutes: number;
  };
};

let attendanceAggregationRunning = false;

function getHeartbeatKey(heartbeat: Pick<HeartbeatRow, 'liveSessionId' | 'studentId'>): string {
  return `${heartbeat.liveSessionId}:${heartbeat.studentId}`;
}

export function sumPlayingSeconds(heartbeats: HeartbeatRow[], now: Date): number {
  let total = 0;

  for (let i = 0; i < heartbeats.length; i += 1) {
    const current = heartbeats[i];
    if (current.playbackState !== 'playing') continue;

    const next = heartbeats[i + 1];
    const intervalEnd = next?.receivedAt ?? now;
    const intervalSeconds = Math.floor((intervalEnd.getTime() - current.receivedAt.getTime()) / 1000);

    if (intervalSeconds > 0) {
      total += Math.min(intervalSeconds, MAX_HEARTBEAT_INTERVAL_SECONDS);
    }
  }

  return total;
}

export async function aggregateSessionAttendance(now = new Date()): Promise<number> {
  if (attendanceAggregationRunning) {
    console.log('[AttendanceCron] Previous aggregation still running; skipping this tick');
    return 0;
  }

  attendanceAggregationRunning = true;

  try {
    const heartbeats = await prisma.watchHeartbeat.findMany({
      orderBy: [
        { liveSessionId: 'asc' },
        { studentId: 'asc' },
        { receivedAt: 'asc' },
      ],
      select: {
        liveSessionId: true,
        studentId: true,
        receivedAt: true,
        playbackState: true,
        liveSession: { select: { durationMinutes: true } },
      },
    });

    const grouped = new Map<string, HeartbeatRow[]>();
    for (const heartbeat of heartbeats) {
      const key = getHeartbeatKey(heartbeat);
      const group = grouped.get(key) ?? [];
      group.push(heartbeat);
      grouped.set(key, group);
    }

    let upserted = 0;
    for (const group of grouped.values()) {
      const first = group[0];
      if (!first) continue;

      const totalWatchSeconds = sumPlayingSeconds(group, now);
      const requiredSeconds = Math.ceil(first.liveSession.durationMinutes * 60 * 0.7);

      await prisma.sessionAttendance.upsert({
        where: {
          liveSessionId_studentId: {
            liveSessionId: first.liveSessionId,
            studentId: first.studentId,
          },
        },
        update: {
          totalWatchSeconds,
          isPresent: totalWatchSeconds >= requiredSeconds,
          markedAt: now,
        },
        create: {
          liveSessionId: first.liveSessionId,
          studentId: first.studentId,
          totalWatchSeconds,
          isPresent: totalWatchSeconds >= requiredSeconds,
          markedAt: now,
        },
      });
      upserted += 1;
    }

    console.log(`[AttendanceCron] Aggregated ${upserted} session attendance records`);
    return upserted;
  } catch (error) {
    console.error('[AttendanceCron] Aggregation failed:', error);
    return 0;
  } finally {
    attendanceAggregationRunning = false;
  }
}
