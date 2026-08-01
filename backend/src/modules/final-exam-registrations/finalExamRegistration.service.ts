import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { getBranchFilter, hasGlobalScope } from '../../common/utils/scope.util';

const VALID_STATUSES = ['registered', 'scheduled', 'completed', 'absent'] as const;

const REGISTRATION_SELECT = {
  id:          true,
  status:      true,
  examDate:    true,
  hallTicketNo: true,
  createdAt:   true,
  updatedAt:   true,
  student:     { select: { id: true, fullName: true, mobile: true, course: true } },
  branch:      { select: { id: true, name: true, city: true } },
  eligibilityRequest: {
    select: {
      id:                        true,
      status:                    true,
      attendancePercentSnapshot: true,
      remainingDueSnapshot:      true,
      decisionRemarks:           true,
      decidedAt:                 true,
    },
  },
};

function assertBranchAccess(user: AuthPayload, branchId: number): void {
  if (!hasGlobalScope(user) && branchId !== user.branchId) {
    console.warn(`[FinalExamRegService] Branch access denied — user branchId=${user.branchId}, resource branchId=${branchId}`);
    throw new Error('ACCESS_DENIED');
  }
}

export const finalExamRegistrationService = {
  // ─── 1. List registrations ──────────────────────────────────────────────────
  list: async (
    user: AuthPayload,
    filters: { status?: string; branchId?: number },
  ) => {
    // branch_admin cannot filter by arbitrary branchId
    if (!hasGlobalScope(user) && filters.branchId && filters.branchId !== user.branchId) {
      throw new Error('ACCESS_DENIED');
    }

    const branchFilter = getBranchFilter(user);
    const where: Record<string, unknown> = { ...branchFilter };
    if (filters.status) where['status'] = filters.status;
    if (hasGlobalScope(user) && filters.branchId) where['branchId'] = filters.branchId;

    console.log(`[FinalExamRegService] Listing registrations — role=${user.role}, filters:`, filters);

    return prisma.finalExamRegistration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select:  REGISTRATION_SELECT,
    });
  },

  // ─── 2. Get by id ───────────────────────────────────────────────────────────
  getById: async (id: number, user: AuthPayload) => {
    const reg = await prisma.finalExamRegistration.findUnique({
      where:  { id },
      select: REGISTRATION_SELECT,
    });
    if (!reg) throw new Error('REGISTRATION_NOT_FOUND');
    assertBranchAccess(user, reg.branch.id);
    return reg;
  },

  // ─── 3. Schedule / update (super_admin only) ────────────────────────────────
  schedule: async (
    id: number,
    data: { examDate?: string; hallTicketNo?: string; status?: string },
  ) => {
    if (data.status && !VALID_STATUSES.includes(data.status as any)) {
      throw new Error('INVALID_REGISTRATION_STATUS');
    }

    const reg = await prisma.finalExamRegistration.findUnique({ where: { id } });
    if (!reg) throw new Error('REGISTRATION_NOT_FOUND');

    // Check hallTicketNo uniqueness if being set
    if (data.hallTicketNo) {
      const conflict = await prisma.finalExamRegistration.findFirst({
        where: { hallTicketNo: data.hallTicketNo, id: { not: id } },
      });
      if (conflict) throw new Error('HALL_TICKET_DUPLICATE');
    }

    const updated = await prisma.finalExamRegistration.update({
      where: { id },
      data: {
        examDate:    data.examDate    ? new Date(data.examDate) : undefined,
        hallTicketNo: data.hallTicketNo ?? undefined,
        status:      data.status      ?? undefined,
      },
      select: REGISTRATION_SELECT,
    });

    console.log(`[FinalExamRegService] Registration id=${id} scheduled — status=${updated.status}, hallTicket=${updated.hallTicketNo}`);
    return updated;
  },

  // ─── 4. Summary ─────────────────────────────────────────────────────────────
  getSummary: async (user: AuthPayload) => {
    const branchFilter = getBranchFilter(user);

    const groups = await prisma.finalExamRegistration.groupBy({
      by:    ['status'],
      where: branchFilter,
      _count: { id: true },
    });

    const countMap = groups.reduce((acc, g) => {
      acc[g.status] = g._count.id;
      return acc;
    }, {} as Record<string, number>);

    const totalRegistrations = groups.reduce((s, g) => s + g._count.id, 0);

    console.log(`[FinalExamRegService] Summary fetched — total=${totalRegistrations}`);

    return {
      totalRegistrations,
      registered: countMap['registered'] ?? 0,
      scheduled:  countMap['scheduled']  ?? 0,
      completed:  countMap['completed']  ?? 0,
      absent:     countMap['absent']     ?? 0,
    };
  },
};

