import { LiveSessionType } from '@prisma/client';
import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { ROLES } from '../../common/roles';
import { isSuperAdmin } from '../../common/utils/scope.util';
import { assertTeacherBatchAccess } from '../../common/utils/teacher-scope.util';
import { getStudentRecord } from '../../common/utils/student-scope.util';

const LIVE_SESSION_SELECT = {
  id: true,
  batchId: true,
  title: true,
  youtubeVideoId: true,
  sessionType: true,
  scheduledAt: true,
  durationMinutes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  batch: {
    select: {
      id: true,
      name: true,
      branchId: true,
      course: { select: { id: true, name: true, code: true } },
      branch: { select: { id: true, name: true, city: true } },
    },
  },
};

type CreateLiveSessionData = {
  batchId: number;
  title: string;
  youtubeVideoId: string;
  sessionType: LiveSessionType;
  scheduledAt: string;
  durationMinutes: number;
  isActive?: boolean;
};

function assertBranchAccess(user: AuthPayload, branchId: number): void {
  if (!isSuperAdmin(user.role) && branchId !== user.branchId) {
    console.warn(`[LiveSessionService] Branch access denied — user branchId=${user.branchId}, resource branchId=${branchId}`);
    throw new Error('ACCESS_DENIED');
  }
}

async function assertBatchAccess(user: AuthPayload, batchId: number): Promise<{ id: number; branchId: number }> {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { id: true, branchId: true },
  });
  if (!batch) throw new Error('BATCH_NOT_FOUND');

  assertBranchAccess(user, batch.branchId);
  await assertTeacherBatchAccess(user, batchId);

  return batch;
}

export const liveSessionService = {
  createLiveSession: async (user: AuthPayload, data: CreateLiveSessionData) => {
    await assertBatchAccess(user, data.batchId);

    const liveSession = await prisma.liveSession.create({
      data: {
        batchId: data.batchId,
        title: data.title,
        youtubeVideoId: data.youtubeVideoId,
        sessionType: data.sessionType,
        scheduledAt: new Date(data.scheduledAt),
        durationMinutes: data.durationMinutes,
        isActive: data.isActive ?? true,
      },
      select: LIVE_SESSION_SELECT,
    });

    console.log(`[LiveSessionService] LiveSession created: id=${liveSession.id}, batchId=${data.batchId}`);
    return liveSession;
  },

  getByBatch: async (user: AuthPayload, batchId: number) => {
    await assertBatchAccess(user, batchId);

    return prisma.liveSession.findMany({
      where: { batchId },
      orderBy: { scheduledAt: 'desc' },
      select: LIVE_SESSION_SELECT,
    });
  },

  getById: async (user: AuthPayload, id: number) => {
    const liveSession = await prisma.liveSession.findUnique({
      where: { id },
      select: LIVE_SESSION_SELECT,
    });
    if (!liveSession) throw new Error('LIVE_SESSION_NOT_FOUND');

    assertBranchAccess(user, liveSession.batch.branchId);
    if (user.role === ROLES.TEACHER) {
      await assertTeacherBatchAccess(user, liveSession.batchId);
    }

    return liveSession;
  },

  getStudentSessions: async (user: AuthPayload) => {
    const record = await getStudentRecord(user);
    if (!record) throw new Error('STUDENT_RECORD_NOT_FOUND');
    assertBranchAccess(user, record.branchId);

    const batchStudent = await prisma.batchStudent.findFirst({
      where: {
        studentId: record.studentId,
        status: 'active',
        batch: { branchId: record.branchId, isActive: true },
      },
      orderBy: { joinedAt: 'desc' },
      select: {
        batchId: true,
        batch: {
          select: {
            id: true,
            name: true,
            course: { select: { id: true, name: true, code: true } },
            branch: { select: { id: true, name: true, city: true } },
          },
        },
      },
    });

    if (!batchStudent) {
      console.log(`[LiveSessionService] No active batch for studentId=${record.studentId}`);
      return { batch: null, currentLiveSession: null, recordedSessions: [] };
    }

    const now = new Date();
    const activeLiveSessions = await prisma.liveSession.findMany({
      where: {
        batchId: batchStudent.batchId,
        sessionType: LiveSessionType.live,
        isActive: true,
        scheduledAt: { lte: now },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 10,
      select: LIVE_SESSION_SELECT,
    });

    const currentLiveSession = activeLiveSessions.find((session) => {
      const endsAt = new Date(session.scheduledAt.getTime() + session.durationMinutes * 1000 * 60);
      return endsAt >= now;
    }) ?? null;

    const recordedSessions = await prisma.liveSession.findMany({
      where: {
        batchId: batchStudent.batchId,
        sessionType: LiveSessionType.recorded,
        isActive: true,
        scheduledAt: { lt: now },
      },
      orderBy: { scheduledAt: 'desc' },
      select: LIVE_SESSION_SELECT,
    });

    console.log(
      `[LiveSessionService] Student sessions fetched — studentId=${record.studentId}, batchId=${batchStudent.batchId}, recorded=${recordedSessions.length}`,
    );

    return {
      batch: batchStudent.batch,
      currentLiveSession,
      recordedSessions,
    };
  },
};
