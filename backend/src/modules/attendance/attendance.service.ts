import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { isSuperAdmin } from '../../common/utils/scope.util';
import { assertTeacherBatchAccess } from '../../common/utils/teacher-scope.util';
import { getStudentRecord } from '../../common/utils/student-scope.util';

const VALID_STATUSES = ['present', 'absent', 'leave'] as const;

const ATTENDANCE_SELECT = {
  id: true,
  attendanceDate: true,
  status: true,
  remarks: true,
  createdAt: true,
  updatedAt: true,
  student:   { select: { id: true, fullName: true, mobile: true } },
  batch:     { select: { id: true, name: true } },
  markedBy:  { select: { id: true, name: true } },
};

/** Normalize any datetime to midnight UTC for consistent date-level uniqueness */
function toDateOnly(raw: string | Date): Date {
  const d = new Date(raw);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function assertBranchAccess(user: AuthPayload, branchId: number): void {
  if (!isSuperAdmin(user.role) && branchId !== user.branchId) {
    console.warn(`[AttendanceService] Branch access denied — user branchId=${user.branchId}, resource branchId=${branchId}`);
    throw new Error('ACCESS_DENIED');
  }
}

export interface AttendanceEntry {
  studentId: number;
  status: string;
  remarks?: string;
}

export const attendanceService = {
  markAttendance: async (
    user: AuthPayload,
    data: { batchId: number; attendanceDate: string; entries: AttendanceEntry[] },
  ) => {
    if (!data.entries || data.entries.length === 0) throw new Error('ENTRIES_REQUIRED');

    const batch = await prisma.batch.findUnique({ where: { id: data.batchId } });
    if (!batch) throw new Error('BATCH_NOT_FOUND');
    assertBranchAccess(user, batch.branchId);
    // Teacher must be assigned to this batch
    await assertTeacherBatchAccess(user, data.batchId);

    // Validate all statuses upfront
    for (const entry of data.entries) {
      if (!VALID_STATUSES.includes(entry.status as any)) throw new Error('INVALID_STATUS');
    }

    // Validate all students are assigned to this batch
    const studentIds = data.entries.map((e) => e.studentId);
    const assignments = await prisma.batchStudent.findMany({
      where: { batchId: data.batchId, studentId: { in: studentIds } },
      select: { studentId: true },
    });
    const assignedIds = new Set(assignments.map((a) => a.studentId));
    const unassigned = studentIds.filter((id) => !assignedIds.has(id));
    if (unassigned.length > 0) {
      console.warn(`[AttendanceService] Students not in batch: ${unassigned.join(', ')}`);
      throw new Error('STUDENT_NOT_IN_BATCH');
    }

    const normalizedDate = toDateOnly(data.attendanceDate);

    // Upsert each entry — idempotent re-marking for same day
    const upserts = data.entries.map((entry) =>
      prisma.attendance.upsert({
        where: {
          batchId_studentId_attendanceDate: {
            batchId:        data.batchId,
            studentId:      entry.studentId,
            attendanceDate: normalizedDate,
          },
        },
        update: {
          status:        entry.status,
          remarks:       entry.remarks ?? null,
          markedByUserId: user.userId,
        },
        create: {
          batchId:        data.batchId,
          studentId:      entry.studentId,
          branchId:       batch.branchId,
          attendanceDate: normalizedDate,
          status:         entry.status,
          remarks:        entry.remarks ?? null,
          markedByUserId: user.userId,
        },
      }),
    );

    await prisma.$transaction(upserts);

    const counts = data.entries.reduce(
      (acc, e) => {
        acc[e.status] = (acc[e.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log(`[AttendanceService] Attendance marked — batchId=${data.batchId}, date=${normalizedDate.toISOString()}, total=${data.entries.length}`);

    return {
      batchId:        data.batchId,
      attendanceDate: normalizedDate,
      totalMarked:    data.entries.length,
      presentCount:   counts['present'] ?? 0,
      absentCount:    counts['absent']  ?? 0,
      leaveCount:     counts['leave']   ?? 0,
    };
  },

  getByBatch: async (batchId: number, user: AuthPayload, date?: string) => {
    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('BATCH_NOT_FOUND');
    assertBranchAccess(user, batch.branchId);
    // Teacher must be assigned to this batch
    await assertTeacherBatchAccess(user, batchId);

    const where: any = { batchId };
    if (date) {
      where.attendanceDate = toDateOnly(date);
      console.log(`[AttendanceService] Fetching batch attendance for date=${date}`);
    }

    return prisma.attendance.findMany({
      where,
      orderBy: [{ attendanceDate: 'desc' }, { student: { fullName: 'asc' } }],
      select: ATTENDANCE_SELECT,
    });
  },

  getByStudent: async (studentId: number, user: AuthPayload) => {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new Error('STUDENT_NOT_FOUND');
    assertBranchAccess(user, student.branchId);

    const records = await prisma.attendance.findMany({
      where: { studentId },
      orderBy: { attendanceDate: 'desc' },
      select: ATTENDANCE_SELECT,
    });

    const totals = records.reduce(
      (acc, r) => {
        if (r.status === 'present') acc.totalPresent++;
        else if (r.status === 'absent') acc.totalAbsent++;
        else if (r.status === 'leave') acc.totalLeave++;
        return acc;
      },
      { totalPresent: 0, totalAbsent: 0, totalLeave: 0 },
    );

    return { studentId, ...totals, records };
  },

  /**
   * Student reads only their own attendance — no studentId param needed,
   * identity is derived from the JWT via getStudentRecord.
   */
  getMyAttendance: async (user: AuthPayload) => {
    const record = await getStudentRecord(user);
    if (!record) throw new Error('STUDENT_RECORD_NOT_FOUND');

    const records = await prisma.attendance.findMany({
      where:   { studentId: record.studentId },
      orderBy: { attendanceDate: 'desc' },
      select:  ATTENDANCE_SELECT,
    });

    const totals = records.reduce(
      (acc, r) => {
        if (r.status === 'present') acc.totalPresent++;
        else if (r.status === 'absent') acc.totalAbsent++;
        else if (r.status === 'leave') acc.totalLeave++;
        return acc;
      },
      { totalPresent: 0, totalAbsent: 0, totalLeave: 0 },
    );

    console.log(`[AttendanceService] Student own attendance fetched — studentId=${record.studentId}`);
    return { studentId: record.studentId, ...totals, records };
  },

  getBatchSummary: async (batchId: number, user: AuthPayload) => {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { id: true, name: true, branchId: true, _count: { select: { batchStudents: true } } },
    });
    if (!batch) throw new Error('BATCH_NOT_FOUND');
    assertBranchAccess(user, batch.branchId);
    // Teacher must be assigned to this batch
    await assertTeacherBatchAccess(user, batchId);

    const aggregate = await prisma.attendance.groupBy({
      by: ['status'],
      where: { batchId },
      _count: { id: true },
    });

    const countMap = aggregate.reduce((acc, g) => {
      acc[g.status] = g._count.id;
      return acc;
    }, {} as Record<string, number>);

    const totalRecords = Object.values(countMap).reduce((s, v) => s + v, 0);

    // Per-student attendance percentage
    const perStudent = await prisma.attendance.groupBy({
      by: ['studentId'],
      where: { batchId },
      _count: { id: true },
    });

    const presentPerStudent = await prisma.attendance.groupBy({
      by: ['studentId'],
      where: { batchId, status: 'present' },
      _count: { id: true },
    });
    const presentMap = new Map(presentPerStudent.map((p) => [p.studentId, p._count.id]));

    const studentIds = perStudent.map((p) => p.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, fullName: true },
    });
    const studentMap = new Map(students.map((s) => [s.id, s.fullName]));

    const attendancePerStudent = perStudent.map((p) => {
      const total   = p._count.id;
      const present = presentMap.get(p.studentId) ?? 0;
      return {
        studentId:   p.studentId,
        fullName:    studentMap.get(p.studentId) ?? 'Unknown',
        totalClasses: total,
        present,
        attendancePercent: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    });

    console.log(`[AttendanceService] Batch summary fetched for batchId=${batchId}`);

    return {
      batchId,
      batchName:              batch.name,
      totalStudents:          batch._count.batchStudents,
      totalAttendanceRecords: totalRecords,
      presentCount:           countMap['present'] ?? 0,
      absentCount:            countMap['absent']  ?? 0,
      leaveCount:             countMap['leave']   ?? 0,
      attendancePerStudent,
    };
  },
};
