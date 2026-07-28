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

function getIndiaTimeParts(date = new Date()): { dayOfWeek: number; time: string; date: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const days: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    dayOfWeek: days[parts.weekday],
    time: `${parts.hour}:${parts.minute}`,
    date: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

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

async function assertBatchAccess(user: AuthPayload, batchId: number): Promise<{ id: number; branchId: number; isCentralProgramme: boolean }> {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { id: true, branchId: true, isCentralProgramme: true },
  });
  if (!batch) throw new Error('BATCH_NOT_FOUND');

  await assertTeacherBatchAccess(user, batchId);
  if (user.role !== ROLES.TEACHER || !batch.isCentralProgramme) {
    assertBranchAccess(user, batch.branchId);
  }

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

    if (user.role === ROLES.TEACHER) {
      await assertTeacherBatchAccess(user, liveSession.batchId);
    }
    const centralBatch = await prisma.batch.findUnique({
      where: { id: liveSession.batchId }, select: { isCentralProgramme: true },
    });
    if (user.role !== ROLES.TEACHER || !centralBatch?.isCentralProgramme) {
      assertBranchAccess(user, liveSession.batch.branchId);
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
        batch: {
          isActive: true,
          OR: [{ branchId: record.branchId }, { isCentralProgramme: true }],
        },
      },
      orderBy: { joinedAt: 'desc' },
      select: {
        batchId: true,
        batch: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            teamsJoinUrl: true,
            batchSchedules: { select: { dayOfWeek: true, startTime: true, endTime: true } },
            course: { select: { id: true, name: true, code: true } },
            branch: { select: { id: true, name: true, city: true } },
          },
        },
      },
    });

    if (!batchStudent) {
      console.log(`[LiveSessionService] No active batch for studentId=${record.studentId}`);
      return {
        batch: null,
        currentLiveSession: null,
        currentTeamsMeeting: null,
        upcomingTeamsMeeting: null,
        recordedSessions: [],
      };
    }

    const now = new Date();
    const indiaNow = getIndiaTimeParts(now);
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

    const batchStart = batchStudent.batch.startDate.toISOString().slice(0, 10);
    const batchEnd = batchStudent.batch.endDate?.toISOString().slice(0, 10) ?? null;
    const activeSchedule = batchStudent.batch.batchSchedules.find((slot) =>
      slot.dayOfWeek === indiaNow.dayOfWeek && slot.startTime <= indiaNow.time && indiaNow.time < slot.endTime,
    );
    const batchIsInDateRange = indiaNow.date >= batchStart && (!batchEnd || indiaNow.date <= batchEnd);
    const currentTeamsMeeting = batchStudent.batch.teamsJoinUrl && activeSchedule && batchIsInDateRange
      ? {
          batchId: batchStudent.batch.id,
          batchName: batchStudent.batch.name,
          joinUrl: batchStudent.batch.teamsJoinUrl,
          startTime: activeSchedule.startTime,
          endTime: activeSchedule.endTime,
        }
      : null;
    const upcomingSchedule = batchStudent.batch.teamsJoinUrl && !currentTeamsMeeting
      ? batchStudent.batch.batchSchedules
          .map((slot) => {
            const daysUntilSlot = (slot.dayOfWeek - indiaNow.dayOfWeek + 7) % 7;
            const startsLaterToday = daysUntilSlot === 0 && slot.startTime > indiaNow.time;
            const offsetDays = startsLaterToday || daysUntilSlot > 0 ? daysUntilSlot : 7;
            const scheduledDate = addDays(indiaNow.date, offsetDays);
            return { slot, scheduledDate };
          })
          .filter(({ scheduledDate }) => scheduledDate >= batchStart && (!batchEnd || scheduledDate <= batchEnd))
          .sort((a, b) =>
            a.scheduledDate === b.scheduledDate
              ? a.slot.startTime.localeCompare(b.slot.startTime)
              : a.scheduledDate.localeCompare(b.scheduledDate)
          )[0] ?? null
      : null;
    const upcomingTeamsMeeting = upcomingSchedule && batchStudent.batch.teamsJoinUrl
      ? {
          batchId: batchStudent.batch.id,
          batchName: batchStudent.batch.name,
          joinUrl: batchStudent.batch.teamsJoinUrl,
          date: upcomingSchedule.scheduledDate,
          dayName: DAY_NAMES[upcomingSchedule.slot.dayOfWeek],
          startTime: upcomingSchedule.slot.startTime,
          endTime: upcomingSchedule.slot.endTime,
        }
      : null;

    return {
      batch: batchStudent.batch,
      currentLiveSession,
      currentTeamsMeeting,
      upcomingTeamsMeeting,
      recordedSessions,
    };
  },
};
