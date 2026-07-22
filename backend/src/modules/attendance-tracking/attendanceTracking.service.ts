import { PlaybackState } from '@prisma/client';
import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { ROLES } from '../../common/roles';
import { isSuperAdmin } from '../../common/utils/scope.util';
import { getStudentRecord } from '../../common/utils/student-scope.util';
import { assertTeacherBatchAccess } from '../../common/utils/teacher-scope.util';

const HEARTBEAT_SELECT = {
  id: true,
  liveSessionId: true,
  studentId: true,
  receivedAt: true,
  playbackState: true,
};

export const attendanceTrackingService = {
  recordHeartbeat: async (
    user: AuthPayload,
    data: { liveSessionId: number; playbackState: PlaybackState },
  ) => {
    const record = await getStudentRecord(user);
    if (!record) throw new Error('STUDENT_RECORD_NOT_FOUND');

    const liveSession = await prisma.liveSession.findUnique({
      where: { id: data.liveSessionId },
      select: {
        id: true,
        batchId: true,
        batch: { select: { branchId: true } },
      },
    });
    if (!liveSession) throw new Error('LIVE_SESSION_NOT_FOUND');

    if (liveSession.batch.branchId !== record.branchId || liveSession.batch.branchId !== user.branchId) {
      console.warn(
        `[AttendanceTracking] Branch access denied — studentId=${record.studentId}, liveSessionId=${data.liveSessionId}`,
      );
      throw new Error('ACCESS_DENIED');
    }

    const batchStudent = await prisma.batchStudent.findFirst({
      where: {
        batchId: liveSession.batchId,
        studentId: record.studentId,
        status: 'active',
      },
      select: { id: true },
    });
    if (!batchStudent) throw new Error('BATCH_MEMBERSHIP_REQUIRED');

    const heartbeat = await prisma.watchHeartbeat.create({
      data: {
        liveSessionId: liveSession.id,
        studentId: record.studentId,
        playbackState: data.playbackState,
      },
      select: HEARTBEAT_SELECT,
    });

    console.log(
      `[AttendanceTracking] Heartbeat recorded — studentId=${record.studentId}, liveSessionId=${liveSession.id}, state=${data.playbackState}`,
    );
    return heartbeat;
  },

  getSessionAttendance: async (user: AuthPayload, liveSessionId: number) => {
    const liveSession = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: {
        id: true,
        batchId: true,
        title: true,
        durationMinutes: true,
        batch: { select: { id: true, name: true, branchId: true } },
      },
    });
    if (!liveSession) throw new Error('LIVE_SESSION_NOT_FOUND');

    if (!isSuperAdmin(user.role) && liveSession.batch.branchId !== user.branchId) {
      console.warn(
        `[AttendanceTracking] Session attendance branch denied — user branchId=${user.branchId}, session branchId=${liveSession.batch.branchId}`,
      );
      throw new Error('ACCESS_DENIED');
    }

    if (user.role === ROLES.TEACHER) {
      await assertTeacherBatchAccess(user, liveSession.batchId);
    }

    const attendance = await prisma.sessionAttendance.findMany({
      where: { liveSessionId },
      orderBy: [
        { isPresent: 'desc' },
        { totalWatchSeconds: 'desc' },
      ],
      select: {
        id: true,
        liveSessionId: true,
        studentId: true,
        totalWatchSeconds: true,
        isPresent: true,
        markedAt: true,
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    console.log(
      `[AttendanceTracking] Session attendance fetched — liveSessionId=${liveSessionId}, count=${attendance.length}`,
    );

    return {
      liveSession,
      attendance,
    };
  },

  getMySessionAttendance: async (user: AuthPayload, liveSessionId: number) => {
    const record = await getStudentRecord(user);
    if (!record) throw new Error('STUDENT_RECORD_NOT_FOUND');

    const liveSession = await prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: {
        id: true,
        batchId: true,
        durationMinutes: true,
        batch: { select: { branchId: true } },
      },
    });
    if (!liveSession) throw new Error('LIVE_SESSION_NOT_FOUND');

    if (liveSession.batch.branchId !== record.branchId || liveSession.batch.branchId !== user.branchId) {
      throw new Error('ACCESS_DENIED');
    }

    const batchStudent = await prisma.batchStudent.findFirst({
      where: {
        batchId: liveSession.batchId,
        studentId: record.studentId,
        status: 'active',
      },
      select: { id: true },
    });
    if (!batchStudent) throw new Error('BATCH_MEMBERSHIP_REQUIRED');

    const attendance = await prisma.sessionAttendance.findUnique({
      where: {
        liveSessionId_studentId: {
          liveSessionId,
          studentId: record.studentId,
        },
      },
      select: {
        id: true,
        liveSessionId: true,
        studentId: true,
        totalWatchSeconds: true,
        isPresent: true,
        markedAt: true,
      },
    });

    return {
      liveSession: {
        id: liveSession.id,
        durationMinutes: liveSession.durationMinutes,
      },
      attendance,
    };
  },
};
