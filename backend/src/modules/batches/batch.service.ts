import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { getBranchFilter, isSuperAdmin } from '../../common/utils/scope.util';
import { getTeacherBatchIds, assertTeacherBatchAccess } from '../../common/utils/teacher-scope.util';
import { ROLES } from '../../common/roles';

const BATCH_SELECT = {
  id: true,
  name: true,
  schedule: true,
  capacity: true,
  startDate: true,
  endDate: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  course: { select: { id: true, name: true, code: true } },
  branch: { select: { id: true, name: true, city: true } },
  _count: { select: { batchStudents: true } },
};

function assertBranchAccess(user: AuthPayload, branchId: number): void {
  if (!isSuperAdmin(user.role) && branchId !== user.branchId) {
    console.warn(`[BatchService] Branch access denied — user branchId=${user.branchId}, resource branchId=${branchId}`);
    throw new Error('ACCESS_DENIED');
  }
}

export const batchService = {
  createBatch: async (
    user: AuthPayload,
    data: {
      name: string;
      courseId: number;
      branchId: number;
      startDate: string;
      endDate?: string;
      schedule?: string;
      capacity?: number;
    },
  ) => {
    assertBranchAccess(user, data.branchId);

    const [course, branch] = await Promise.all([
      prisma.course.findUnique({ where: { id: data.courseId } }),
      prisma.branch.findUnique({ where: { id: data.branchId } }),
    ]);
    if (!course) throw new Error('COURSE_NOT_FOUND');
    if (!branch) throw new Error('BRANCH_NOT_FOUND');

    const batch = await prisma.batch.create({
      data: {
        name:      data.name,
        courseId:  data.courseId,
        branchId:  data.branchId,
        startDate: new Date(data.startDate),
        endDate:   data.endDate ? new Date(data.endDate) : null,
        schedule:  data.schedule ?? null,
        capacity:  data.capacity ?? null,
      },
      select: BATCH_SELECT,
    });

    console.log(`[BatchService] Batch created: "${batch.name}", branchId=${data.branchId}, courseId=${data.courseId}`);
    return batch;
  },

  getAllBatches: async (user: AuthPayload) => {
    // Teacher: only assigned batches
    if (user.role === ROLES.TEACHER) {
      const batchIds = await getTeacherBatchIds(user);
      console.log(`[BatchService] Teacher fetch — userId=${user.userId}, batchIds=[${batchIds?.join(', ')}]`);
      return prisma.batch.findMany({
        where: { id: { in: batchIds ?? [] }, branchId: user.branchId as number },
        orderBy: { startDate: 'desc' },
        select: BATCH_SELECT,
      });
    }
    const filter = getBranchFilter(user);
    console.log(`[BatchService] Fetching batches with filter:`, filter);
    return prisma.batch.findMany({
      where: filter,
      orderBy: { startDate: 'desc' },
      select: BATCH_SELECT,
    });
  },

  getBatchById: async (id: number, user: AuthPayload) => {
    const batch = await prisma.batch.findUnique({ where: { id }, select: BATCH_SELECT });
    if (!batch) throw new Error('BATCH_NOT_FOUND');
    assertBranchAccess(user, batch.branch.id);
    await assertTeacherBatchAccess(user, id);
    return batch;
  },

  // Teacher dashboard summary — assigned batches with student counts
  getTeacherSummary: async (user: AuthPayload) => {
    const batchIds = await getTeacherBatchIds(user);
    if (!batchIds) throw new Error('ACCESS_DENIED');

    const batches = await prisma.batch.findMany({
      where: { id: { in: batchIds }, branchId: user.branchId as number },
      select: {
        ...BATCH_SELECT,
        batchStudents: { select: { id: true, status: true } },
        batchSchedules: { select: { id: true, dayOfWeek: true, startTime: true, endTime: true } },
      },
    });

    return batches.map((b) => ({
      ...b,
      activeStudents: b.batchStudents.filter((s) => s.status === 'active').length,
    }));
  },

  updateBatch: async (
    id: number,
    user: AuthPayload,
    data: {
      name?: string;
      schedule?: string;
      capacity?: number;
      endDate?: string;
      isActive?: boolean;
    },
  ) => {
    const existing = await prisma.batch.findUnique({ where: { id } });
    if (!existing) throw new Error('BATCH_NOT_FOUND');
    assertBranchAccess(user, existing.branchId);

    const updated = await prisma.batch.update({
      where: { id },
      data: {
        ...(data.name     !== undefined && { name: data.name }),
        ...(data.schedule !== undefined && { schedule: data.schedule }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.endDate  !== undefined && { endDate: new Date(data.endDate) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      select: BATCH_SELECT,
    });

    console.log(`[BatchService] Batch updated: id=${id}, isActive=${updated.isActive}`);
    return updated;
  },
};
