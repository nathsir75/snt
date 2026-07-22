import { PlaybackState } from '@prisma/client';
import prisma from '../../db/prisma';
import { attendanceTrackingService } from './attendanceTracking.service';
import { aggregateSessionAttendance } from './attendanceAggregation.service';

jest.mock('../../db/prisma', () => ({
  __esModule: true,
  default: {
    student: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    liveSession: {
      findUnique: jest.fn(),
    },
    batchStudent: {
      findFirst: jest.fn(),
    },
    watchHeartbeat: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    sessionAttendance: {
      upsert: jest.fn(),
    },
  },
}));

const prismaMock = prisma as unknown as {
  student: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
  };
  liveSession: {
    findUnique: jest.Mock;
  };
  batchStudent: {
    findFirst: jest.Mock;
  };
  watchHeartbeat: {
    create: jest.Mock;
    findMany: jest.Mock;
  };
  sessionAttendance: {
    upsert: jest.Mock;
  };
};

describe('attendance tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('inserts a heartbeat for an enrolled student', async () => {
    prismaMock.student.findUnique.mockResolvedValue({ id: 11, branchId: 5 });
    prismaMock.liveSession.findUnique.mockResolvedValue({
      id: 101,
      batchId: 201,
      batch: { branchId: 5 },
    });
    prismaMock.batchStudent.findFirst.mockResolvedValue({ id: 301 });
    prismaMock.watchHeartbeat.create.mockResolvedValue({
      id: 401,
      liveSessionId: 101,
      studentId: 11,
      receivedAt: new Date('2026-07-11T10:00:00.000Z'),
      playbackState: PlaybackState.playing,
    });

    const heartbeat = await attendanceTrackingService.recordHeartbeat(
      { userId: 9001, role: 'student', branchId: 5 },
      { liveSessionId: 101, playbackState: PlaybackState.playing },
    );

    expect(prismaMock.watchHeartbeat.create).toHaveBeenCalledWith({
      data: {
        liveSessionId: 101,
        studentId: 11,
        playbackState: PlaybackState.playing,
      },
      select: {
        id: true,
        liveSessionId: true,
        studentId: true,
        receivedAt: true,
        playbackState: true,
      },
    });
    expect(heartbeat).toMatchObject({
      id: 401,
      liveSessionId: 101,
      studentId: 11,
      playbackState: PlaybackState.playing,
    });
  });

  it('aggregates playing seconds and marks present at the 70% threshold', async () => {
    const liveSessionId = 101;
    const studentId = 11;
    const now = new Date('2026-07-11T10:42:00.000Z');

    prismaMock.watchHeartbeat.findMany.mockResolvedValue(
      [0, 5, 10, 15, 20, 25, 30, 35, 40].map((minute) => ({
        liveSessionId,
        studentId,
        receivedAt: new Date(`2026-07-11T10:${String(minute).padStart(2, '0')}:00.000Z`),
        playbackState: PlaybackState.playing,
        liveSession: { durationMinutes: 60 },
      })),
    );

    const count = await aggregateSessionAttendance(now);

    expect(count).toBe(1);
    expect(prismaMock.sessionAttendance.upsert).toHaveBeenCalledWith({
      where: {
        liveSessionId_studentId: {
          liveSessionId,
          studentId,
        },
      },
      update: {
        totalWatchSeconds: 2520,
        isPresent: true,
        markedAt: now,
      },
      create: {
        liveSessionId,
        studentId,
        totalWatchSeconds: 2520,
        isPresent: true,
        markedAt: now,
      },
    });
  });

  it('rejects heartbeats from students not enrolled in the live session batch', async () => {
    prismaMock.student.findUnique.mockResolvedValue({ id: 11, branchId: 5 });
    prismaMock.liveSession.findUnique.mockResolvedValue({
      id: 101,
      batchId: 201,
      batch: { branchId: 5 },
    });
    prismaMock.batchStudent.findFirst.mockResolvedValue(null);

    await expect(
      attendanceTrackingService.recordHeartbeat(
        { userId: 9001, role: 'student', branchId: 5 },
        { liveSessionId: 101, playbackState: PlaybackState.playing },
      ),
    ).rejects.toThrow('BATCH_MEMBERSHIP_REQUIRED');

    expect(prismaMock.watchHeartbeat.create).not.toHaveBeenCalled();
  });
});
