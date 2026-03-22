import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { isSuperAdmin } from '../../common/utils/scope.util';
import { assertTeacherBatchAccess } from '../../common/utils/teacher-scope.util';

const SCHEDULE_SELECT = {
  id: true,
  dayOfWeek: true,
  startTime: true,
  endTime: true,
  room: true,
  createdAt: true,
  updatedAt: true,
  batch: { select: { id: true, name: true, branch: { select: { id: true, name: true } } } },
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Compare "HH:MM" strings — returns true if a < b */
function timeBefore(a: string, b: string): boolean {
  return a.localeCompare(b) < 0;
}

function validateTimeSlot(startTime: string, endTime: string): void {
  const timeRe = /^\d{2}:\d{2}$/;
  if (!timeRe.test(startTime) || !timeRe.test(endTime)) throw new Error('INVALID_TIME_FORMAT');
  if (!timeBefore(startTime, endTime)) throw new Error('INVALID_TIME_RANGE');
}

function assertBranchAccess(user: AuthPayload, branchId: number): void {
  if (!isSuperAdmin(user.role) && branchId !== user.branchId) {
    console.warn(`[ScheduleService] Branch access denied — user branchId=${user.branchId}, resource branchId=${branchId}`);
    throw new Error('ACCESS_DENIED');
  }
}

export const scheduleService = {
  createSchedule: async (
    user: AuthPayload,
    data: { batchId: number; dayOfWeek: number; startTime: string; endTime: string; room?: string },
  ) => {
    if (data.dayOfWeek < 0 || data.dayOfWeek > 6) throw new Error('INVALID_DAY_OF_WEEK');
    validateTimeSlot(data.startTime, data.endTime);

    const batch = await prisma.batch.findUnique({ where: { id: data.batchId } });
    if (!batch) throw new Error('BATCH_NOT_FOUND');
    assertBranchAccess(user, batch.branchId);

    const dup = await prisma.batchSchedule.findUnique({
      where: { batchId_dayOfWeek_startTime: { batchId: data.batchId, dayOfWeek: data.dayOfWeek, startTime: data.startTime } },
    });
    if (dup) {
      console.warn(`[ScheduleService] Duplicate slot blocked — batchId=${data.batchId}, day=${data.dayOfWeek}, start=${data.startTime}`);
      throw new Error('DUPLICATE_SCHEDULE');
    }

    const schedule = await prisma.batchSchedule.create({
      data: {
        batchId:   data.batchId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime:   data.endTime,
        room:      data.room ?? null,
      },
      select: SCHEDULE_SELECT,
    });

    console.log(`[ScheduleService] Schedule created — batchId=${data.batchId}, ${DAY_NAMES[data.dayOfWeek]} ${data.startTime}-${data.endTime}`);
    return schedule;
  },

  getSchedulesByBatch: async (batchId: number, user: AuthPayload) => {
    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('BATCH_NOT_FOUND');
    assertBranchAccess(user, batch.branchId);
    // Teacher must be assigned to this batch
    await assertTeacherBatchAccess(user, batchId);

    const schedules = await prisma.batchSchedule.findMany({
      where: { batchId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      select: SCHEDULE_SELECT,
    });

    // Annotate with day name for readability
    return schedules.map((s) => ({ ...s, dayName: DAY_NAMES[s.dayOfWeek] }));
  },

  updateSchedule: async (
    id: number,
    user: AuthPayload,
    data: { startTime?: string; endTime?: string; room?: string },
  ) => {
    const existing = await prisma.batchSchedule.findUnique({
      where: { id },
      include: { batch: true },
    });
    if (!existing) throw new Error('SCHEDULE_NOT_FOUND');
    assertBranchAccess(user, existing.batch.branchId);

    const newStart = data.startTime ?? existing.startTime;
    const newEnd   = data.endTime   ?? existing.endTime;
    validateTimeSlot(newStart, newEnd);

    // Check duplicate if startTime changed
    if (data.startTime && data.startTime !== existing.startTime) {
      const dup = await prisma.batchSchedule.findUnique({
        where: { batchId_dayOfWeek_startTime: { batchId: existing.batchId, dayOfWeek: existing.dayOfWeek, startTime: data.startTime } },
      });
      if (dup) throw new Error('DUPLICATE_SCHEDULE');
    }

    const updated = await prisma.batchSchedule.update({
      where: { id },
      data: {
        ...(data.startTime !== undefined && { startTime: data.startTime }),
        ...(data.endTime   !== undefined && { endTime: data.endTime }),
        ...(data.room      !== undefined && { room: data.room }),
      },
      select: SCHEDULE_SELECT,
    });

    console.log(`[ScheduleService] Schedule updated: id=${id}`);
    return { ...updated, dayName: DAY_NAMES[updated.dayOfWeek] };
  },

  deleteSchedule: async (id: number, user: AuthPayload) => {
    const existing = await prisma.batchSchedule.findUnique({
      where: { id },
      include: { batch: true },
    });
    if (!existing) throw new Error('SCHEDULE_NOT_FOUND');
    assertBranchAccess(user, existing.batch.branchId);

    await prisma.batchSchedule.delete({ where: { id } });
    console.log(`[ScheduleService] Schedule deleted: id=${id}`);
    return { message: `Schedule id=${id} deleted successfully` };
  },
};
