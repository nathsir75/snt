import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { getBranchFilter, hasGlobalScope } from '../../common/utils/scope.util';
import { createBranchAlert } from '../alerts/alert.service';

const VALID_DECISIONS = ['approved', 'rejected'] as const;

const REQUEST_SELECT = {
  id:                         true,
  status:                     true,
  attendancePercentSnapshot:  true,
  remainingDueSnapshot:       true,
  internalRemarks:            true,
  decisionRemarks:            true,
  decidedAt:                  true,
  createdAt:                  true,
  updatedAt:                  true,
  student:     { select: { id: true, fullName: true, mobile: true, course: true } },
  branch:      { select: { id: true, name: true, city: true } },
  requestedBy: { select: { id: true, name: true } },
  decidedBy:   { select: { id: true, name: true } },
};

function assertBranchAccess(user: AuthPayload, branchId: number): void {
  if (!hasGlobalScope(user) && branchId !== user.branchId) {
    console.warn(`[ExamEligibilityService] Branch access denied — user branchId=${user.branchId}, resource branchId=${branchId}`);
    throw new Error('ACCESS_DENIED');
  }
}

async function computeSnapshots(studentId: number, finalFees: number) {
  const [attendanceGroups, feeAgg] = await Promise.all([
    prisma.attendance.groupBy({
      by:    ['status'],
      where: { studentId },
      _count: { id: true },
    }),
    prisma.feePayment.aggregate({
      where: { studentId },
      _sum:  { amount: true },
    }),
  ]);

  const totalRecords = attendanceGroups.reduce((s, g) => s + g._count.id, 0);
  const presentCount = attendanceGroups.find((g) => g.status === 'present')?._count.id ?? 0;
  const attendancePercentSnapshot = totalRecords > 0
    ? Math.round((presentCount / totalRecords) * 100 * 100) / 100
    : 0;

  const totalPaid          = feeAgg._sum.amount ?? 0;
  const remainingDueSnapshot = Math.max(0, finalFees - totalPaid);

  return { attendancePercentSnapshot, remainingDueSnapshot };
}

export const examEligibilityService = {
  // ─── 1. Create eligibility request ──────────────────────────────────────────
  createRequest: async (
    user: AuthPayload,
    data: { studentId: number; internalRemarks?: string },
  ) => {
    const student = await prisma.student.findUnique({
      where:  { id: data.studentId },
      select: { id: true, fullName: true, mobile: true, course: true, branchId: true, finalFees: true },
    });
    if (!student) throw new Error('STUDENT_NOT_FOUND');
    assertBranchAccess(user, student.branchId);

    // Block duplicate pending request for same student
    const existing = await prisma.examEligibilityRequest.findFirst({
      where: { studentId: data.studentId, status: 'pending' },
    });
    if (existing) throw new Error('DUPLICATE_PENDING_REQUEST');

    const { attendancePercentSnapshot, remainingDueSnapshot } =
      await computeSnapshots(data.studentId, student.finalFees);

    const request = await prisma.examEligibilityRequest.create({
      data: {
        studentId:                  data.studentId,
        branchId:                   student.branchId,
        requestedByUserId:          user.userId,
        attendancePercentSnapshot,
        remainingDueSnapshot,
        internalRemarks:            data.internalRemarks ?? null,
      },
      select: REQUEST_SELECT,
    });

    console.log(
      `[ExamEligibilityService] Request created — studentId=${data.studentId}, attendance=${attendancePercentSnapshot}%, due=${remainingDueSnapshot}`,
    );
    return request;
  },

  // ─── 2. List requests ───────────────────────────────────────────────────────
  list: async (
    user: AuthPayload,
    filters: { status?: string; studentId?: number },
  ) => {
    const branchFilter = getBranchFilter(user);
    const where: Record<string, unknown> = { ...branchFilter };
    if (filters.status)    where['status']    = filters.status;
    if (filters.studentId) where['studentId'] = filters.studentId;

    console.log(`[ExamEligibilityService] Listing requests — role=${user.role}, filters:`, filters);

    return prisma.examEligibilityRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select:  REQUEST_SELECT,
    });
  },

  // ─── 3. Get by id ───────────────────────────────────────────────────────────
  getById: async (id: number, user: AuthPayload) => {
    const request = await prisma.examEligibilityRequest.findUnique({
      where:  { id },
      select: REQUEST_SELECT,
    });
    if (!request) throw new Error('REQUEST_NOT_FOUND');
    assertBranchAccess(user, request.branch.id);
    return request;
  },

  // ─── 4. Decision (super_admin only) ─────────────────────────────────────────
  decide: async (
    id: number,
    user: AuthPayload,
    data: { status: string; decisionRemarks?: string },
  ) => {
    if (!VALID_DECISIONS.includes(data.status as any)) throw new Error('INVALID_DECISION_STATUS');

    const request = await prisma.examEligibilityRequest.findUnique({ where: { id } });
    if (!request) throw new Error('REQUEST_NOT_FOUND');
    if (request.status !== 'pending') throw new Error('ALREADY_DECIDED');

    // Atomic: update request + conditionally create registration
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.examEligibilityRequest.update({
        where: { id },
        data: {
          status:          data.status,
          decisionRemarks: data.decisionRemarks ?? null,
          decidedByUserId: user.userId,
          decidedAt:       new Date(),
        },
        select: REQUEST_SELECT,
      });

      let registration = null;
      if (data.status === 'approved') {
        registration = await tx.finalExamRegistration.create({
          data: {
            studentId:           request.studentId,
            branchId:            request.branchId,
            eligibilityRequestId: id,
          },
          select: {
            id:     true,
            status: true,
            createdAt: true,
            student: { select: { id: true, fullName: true } },
          },
        });
        console.log(
          `[ExamEligibilityService] Final exam registration auto-created — studentId=${request.studentId}, registrationId=${registration.id}`,
        );
      }

      return { updated, registration };
    });

    // Fire alert — isolated from main response
    const decisionLabel = data.status === 'approved' ? 'approved' : 'rejected';
    createBranchAlert({
      type:       'system',
      title:      `Exam eligibility ${decisionLabel}`,
      message:    `Eligibility request #${id} for student has been ${decisionLabel}`,
      branchId:   request.branchId,
      entityType: 'exam_eligibility_request',
      entityId:   id,
      metadata:   { decision: data.status, decisionRemarks: data.decisionRemarks ?? null },
    }).catch((err) =>
      console.error(`[ExamEligibilityService] Alert creation failed for request id=${id}:`, err),
    );

    console.log(`[ExamEligibilityService] Request id=${id} ${data.status} by userId=${user.userId}`);
    return result;
  },
};

