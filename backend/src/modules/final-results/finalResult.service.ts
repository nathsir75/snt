import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { getBranchFilter, isSuperAdmin } from '../../common/utils/scope.util';
import { createBranchAlert } from '../alerts/alert.service';

const RESULT_SELECT = {
  id:               true,
  marksObtained:    true,
  maxMarks:         true,
  resultStatus:     true,
  remarks:          true,
  publishedAt:      true,
  createdAt:        true,
  updatedAt:        true,
  student:          { select: { id: true, fullName: true, mobile: true, course: true } },
  branch:           { select: { id: true, name: true, city: true } },
  publishedBy:      { select: { id: true, name: true } },
  registration:     { select: { id: true, status: true, examDate: true, hallTicketNo: true } },
};

function assertBranchAccess(user: AuthPayload, branchId: number): void {
  if (!isSuperAdmin(user.role) && branchId !== user.branchId) {
    console.warn(`[FinalResultService] Branch access denied — user branchId=${user.branchId}, resource branchId=${branchId}`);
    throw new Error('ACCESS_DENIED');
  }
}

function deriveResultStatus(registrationStatus: string, marksObtained: number, maxMarks: number): string {
  if (registrationStatus === 'absent') return 'absent';
  return marksObtained >= maxMarks * 0.4 ? 'pass' : 'fail';
}

export const finalResultService = {
  // ─── 1. Publish result ──────────────────────────────────────────────────────
  publish: async (
    user: AuthPayload,
    data: { registrationId: number; marksObtained: number; maxMarks: number; remarks?: string },
  ) => {
    if (data.marksObtained < 0)  throw new Error('INVALID_MARKS');
    if (data.maxMarks <= 0)      throw new Error('INVALID_MAX_MARKS');
    if (data.marksObtained > data.maxMarks) throw new Error('MARKS_EXCEED_MAX');

    const registration = await prisma.finalExamRegistration.findUnique({
      where:  { id: data.registrationId },
      select: { id: true, status: true, studentId: true, branchId: true },
    });
    if (!registration) throw new Error('REGISTRATION_NOT_FOUND');

    const existing = await prisma.finalExamResult.findUnique({
      where: { registrationId: data.registrationId },
    });
    if (existing) throw new Error('DUPLICATE_RESULT');

    const resultStatus = deriveResultStatus(registration.status, data.marksObtained, data.maxMarks);

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.finalExamResult.create({
        data: {
          registrationId:   data.registrationId,
          studentId:        registration.studentId,
          branchId:         registration.branchId,
          marksObtained:    data.marksObtained,
          maxMarks:         data.maxMarks,
          resultStatus,
          remarks:          data.remarks ?? null,
          publishedByUserId: user.userId,
        },
        select: RESULT_SELECT,
      });

      // Update registration status to completed unless absent
      if (resultStatus !== 'absent') {
        await tx.finalExamRegistration.update({
          where: { id: data.registrationId },
          data:  { status: 'completed' },
        });
      }

      return created;
    });

    createBranchAlert({
      type:       'system',
      title:      'Final result published',
      message:    `Result published for ${result.student.fullName} — ${resultStatus.toUpperCase()}`,
      branchId:   registration.branchId,
      entityType: 'final_exam_result',
      entityId:   result.id,
      metadata:   { resultStatus, marksObtained: data.marksObtained, maxMarks: data.maxMarks },
    }).catch((err) =>
      console.error(`[FinalResultService] Alert failed for result id=${result.id}:`, err),
    );

    console.log(`[FinalResultService] Result published — registrationId=${data.registrationId}, status=${resultStatus}`);
    return result;
  },

  // ─── 2. List results ────────────────────────────────────────────────────────
  list: async (user: AuthPayload, filters: { resultStatus?: string; branchId?: number }) => {
    if (!isSuperAdmin(user.role) && filters.branchId && filters.branchId !== user.branchId) {
      throw new Error('ACCESS_DENIED');
    }

    const branchFilter = getBranchFilter(user);
    const where: Record<string, unknown> = { ...branchFilter };
    if (filters.resultStatus) where['resultStatus'] = filters.resultStatus;
    if (isSuperAdmin(user.role) && filters.branchId) where['branchId'] = filters.branchId;

    return prisma.finalExamResult.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      select:  RESULT_SELECT,
    });
  },

  // ─── 3. Get by id ───────────────────────────────────────────────────────────
  getById: async (id: number, user: AuthPayload) => {
    const result = await prisma.finalExamResult.findUnique({
      where:  { id },
      select: RESULT_SELECT,
    });
    if (!result) throw new Error('RESULT_NOT_FOUND');
    assertBranchAccess(user, result.branch.id);
    return result;
  },

  // ─── 4. Summary ─────────────────────────────────────────────────────────────
  getSummary: async (user: AuthPayload) => {
    const branchFilter = getBranchFilter(user);

    const groups = await prisma.finalExamResult.groupBy({
      by:    ['resultStatus'],
      where: branchFilter,
      _count: { id: true },
    });

    const countMap = groups.reduce((acc, g) => {
      acc[g.resultStatus] = g._count.id;
      return acc;
    }, {} as Record<string, number>);

    const totalResults = groups.reduce((s, g) => s + g._count.id, 0);

    console.log(`[FinalResultService] Summary fetched — total=${totalResults}`);
    return {
      totalResults,
      pass:   countMap['pass']   ?? 0,
      fail:   countMap['fail']   ?? 0,
      absent: countMap['absent'] ?? 0,
    };
  },
};
