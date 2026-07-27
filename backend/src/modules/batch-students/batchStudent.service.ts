import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { isSuperAdmin } from '../../common/utils/scope.util';
import { assertTeacherBatchAccess } from '../../common/utils/teacher-scope.util';

const VALID_STATUSES = ['active', 'completed', 'dropped'] as const;

const BATCH_STUDENT_SELECT = {
  id: true,
  joinedAt: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  student: { select: { id: true, fullName: true, mobile: true, course: true, branch: { select: { id: true, name: true } } } },
  batch:   { select: { id: true, name: true, schedule: true, isCentralProgramme: true, branch: { select: { id: true, name: true } } } },
};

function assertBranchAccess(user: AuthPayload, branchId: number, context: string): void {
  if (!isSuperAdmin(user.role) && branchId !== user.branchId) {
    console.warn(`[BatchStudentService] Branch access denied on ${context} — user branchId=${user.branchId}, resource branchId=${branchId}`);
    throw new Error('ACCESS_DENIED');
  }
}

export const batchStudentService = {
  assignStudent: async (user: AuthPayload, data: { batchId: number; studentId: number }) => {
    const [batch, student] = await Promise.all([
      prisma.batch.findUnique({ where: { id: data.batchId } }),
      prisma.student.findUnique({ where: { id: data.studentId } }),
    ]);

    if (!batch)   throw new Error('BATCH_NOT_FOUND');
    if (!student) throw new Error('STUDENT_NOT_FOUND');

    if (!batch.isCentralProgramme) {
      assertBranchAccess(user, batch.branchId, `batch id=${data.batchId}`);
    } else if (!isSuperAdmin(user.role)) {
      throw new Error('ACCESS_DENIED');
    }

    if (!batch.isCentralProgramme && batch.branchId !== student.branchId) {
      console.warn(`[BatchStudentService] Cross-branch assignment denied — batch branchId=${batch.branchId}, student branchId=${student.branchId}`);
      throw new Error('BRANCH_MISMATCH');
    }

    const duplicate = await prisma.batchStudent.findUnique({
      where: { batchId_studentId: { batchId: data.batchId, studentId: data.studentId } },
    });
    if (duplicate) {
      console.warn(`[BatchStudentService] Duplicate assignment — studentId=${data.studentId} already in batchId=${data.batchId}`);
      throw new Error('ALREADY_ASSIGNED');
    }

    if (batch.capacity !== null) {
      const currentCount = await prisma.batchStudent.count({
        where: { batchId: data.batchId, status: 'active' },
      });
      if (currentCount >= batch.capacity) {
        throw new Error('CAPACITY_EXCEEDED');
      }
    }

    const assignment = await prisma.batchStudent.create({
      data: { batchId: data.batchId, studentId: data.studentId },
      select: BATCH_STUDENT_SELECT,
    });

    console.log(`[BatchStudentService] Student id=${data.studentId} assigned to batch id=${data.batchId}`);
    return assignment;
  },

  getStudentsByBatch: async (batchId: number, user: AuthPayload) => {
    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('BATCH_NOT_FOUND');
    if (!batch.isCentralProgramme) {
      assertBranchAccess(user, batch.branchId, `batch id=${batchId}`);
    } else if (!isSuperAdmin(user.role) && user.role !== 'teacher') {
      throw new Error('ACCESS_DENIED');
    }
    // Teacher must be assigned to this batch
    await assertTeacherBatchAccess(user, batchId);

    return prisma.batchStudent.findMany({
      where: { batchId },
      orderBy: { joinedAt: 'asc' },
      select: BATCH_STUDENT_SELECT,
    });
  },

  getBatchesByStudent: async (studentId: number, user: AuthPayload) => {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new Error('STUDENT_NOT_FOUND');
    assertBranchAccess(user, student.branchId, `student id=${studentId}`);

    return prisma.batchStudent.findMany({
      where: { studentId },
      orderBy: { joinedAt: 'desc' },
      select: BATCH_STUDENT_SELECT,
    });
  },

  updateStatus: async (id: number, user: AuthPayload, status: string) => {
    if (!VALID_STATUSES.includes(status as any)) throw new Error('INVALID_STATUS');

    const record = await prisma.batchStudent.findUnique({
      where: { id },
      include: { batch: true },
    });
    if (!record) throw new Error('ASSIGNMENT_NOT_FOUND');
    if (!record.batch.isCentralProgramme) {
      assertBranchAccess(user, record.batch.branchId, `batchStudent id=${id}`);
    } else if (!isSuperAdmin(user.role)) {
      throw new Error('ACCESS_DENIED');
    }

    const updated = await prisma.batchStudent.update({
      where: { id },
      data: { status },
      select: BATCH_STUDENT_SELECT,
    });

    console.log(`[BatchStudentService] BatchStudent id=${id} status updated to "${status}"`);
    return updated;
  },
};
