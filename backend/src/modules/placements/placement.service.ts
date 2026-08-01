import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { getBranchFilter, hasGlobalScope } from '../../common/utils/scope.util';
import { createBranchAlert } from '../alerts/alert.service';

const VALID_STATUSES = ['offered', 'joined', 'rejected'] as const;

const PLACEMENT_SELECT = {
  id:            true,
  salaryPackage: true,
  joiningDate:   true,
  status:        true,
  createdAt:     true,
  updatedAt:     true,
  student:    { select: { id: true, fullName: true, mobile: true, course: true, branchId: true } },
  company:    { select: { id: true, name: true, industry: true, location: true } },
  jobOpening: { select: { id: true, title: true } },
};

export const placementService = {
  create: async (
    user: AuthPayload,
    data: {
      studentId:     number;
      companyId:     number;
      jobOpeningId?: number;
      salaryPackage?: number;
      joiningDate?:  string;
      status?:       string;
    },
  ) => {
    if (data.status && !VALID_STATUSES.includes(data.status as any)) {
      throw new Error('INVALID_PLACEMENT_STATUS');
    }

    const student = await prisma.student.findUnique({ where: { id: data.studentId } });
    if (!student) throw new Error('STUDENT_NOT_FOUND');

    const company = await prisma.company.findUnique({ where: { id: data.companyId } });
    if (!company) throw new Error('COMPANY_NOT_FOUND');

    if (data.jobOpeningId) {
      const job = await prisma.jobOpening.findUnique({ where: { id: data.jobOpeningId } });
      if (!job) throw new Error('JOB_OPENING_NOT_FOUND');
    }

    const placement = await prisma.placement.create({
      data: {
        studentId:     data.studentId,
        companyId:     data.companyId,
        jobOpeningId:  data.jobOpeningId  ?? null,
        salaryPackage: data.salaryPackage ?? null,
        joiningDate:   data.joiningDate   ? new Date(data.joiningDate) : null,
        status:        data.status        ?? 'offered',
      },
      select: PLACEMENT_SELECT,
    });

    createBranchAlert({
      type:       'system',
      title:      'Student placement created',
      message:    `${student.fullName} placed at ${company.name}`,
      branchId:   student.branchId,
      entityType: 'placement',
      entityId:   placement.id,
      metadata:   { companyName: company.name, salaryPackage: data.salaryPackage ?? null, status: placement.status },
    }).catch((err) =>
      console.error(`[PlacementService] Alert failed for placement id=${placement.id}:`, err),
    );

    console.log(`[PlacementService] Placement created — studentId=${data.studentId}, companyId=${data.companyId}, status=${placement.status}`);
    return placement;
  },

  list: async (user: AuthPayload, filters: { status?: string; branchId?: number }) => {
    if (!hasGlobalScope(user) && filters.branchId && filters.branchId !== user.branchId) {
      throw new Error('ACCESS_DENIED');
    }

    const where: Record<string, unknown> = {};

    if (!hasGlobalScope(user)) {
      where['student'] = { branchId: user.branchId };
    } else if (filters.branchId) {
      where['student'] = { branchId: filters.branchId };
    }

    if (filters.status) where['status'] = filters.status;

    return prisma.placement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select:  PLACEMENT_SELECT,
    });
  },

  getById: async (id: number, user: AuthPayload) => {
    const placement = await prisma.placement.findUnique({
      where:  { id },
      select: PLACEMENT_SELECT,
    });
    if (!placement) throw new Error('PLACEMENT_NOT_FOUND');

    if (!hasGlobalScope(user) && placement.student.branchId !== user.branchId) {
      throw new Error('ACCESS_DENIED');
    }
    return placement;
  },

  updateStatus: async (
    id: number,
    user: AuthPayload,
    data: { status: string },
  ) => {
    if (!VALID_STATUSES.includes(data.status as any)) throw new Error('INVALID_PLACEMENT_STATUS');

    const placement = await prisma.placement.findUnique({ where: { id }, select: PLACEMENT_SELECT });
    if (!placement) throw new Error('PLACEMENT_NOT_FOUND');

    if (!hasGlobalScope(user) && placement.student.branchId !== user.branchId) {
      throw new Error('ACCESS_DENIED');
    }

    const updated = await prisma.placement.update({
      where: { id },
      data:  { status: data.status },
      select: PLACEMENT_SELECT,
    });

    console.log(`[PlacementService] Placement id=${id} status updated to "${data.status}" by userId=${user.userId}`);
    return updated;
  },

  getSummary: async (user: AuthPayload) => {
    const where: Record<string, unknown> = {};
    if (!hasGlobalScope(user)) {
      where['student'] = { branchId: user.branchId };
    }

    const [groups, salaryAgg] = await Promise.all([
      prisma.placement.groupBy({
        by:    ['status'],
        where,
        _count: { id: true },
      }),
      prisma.placement.aggregate({
        where: { ...where, salaryPackage: { not: null } },
        _avg:  { salaryPackage: true },
        _count: { id: true },
      }),
    ]);

    const countMap    = groups.reduce((acc, g) => { acc[g.status] = g._count.id; return acc; }, {} as Record<string, number>);
    const totalPlaced = groups.reduce((s, g) => s + g._count.id, 0);

    console.log(`[PlacementService] Summary fetched — total=${totalPlaced}`);
    return {
      totalPlaced,
      offers:    countMap['offered']  ?? 0,
      joined:    countMap['joined']   ?? 0,
      rejected:  countMap['rejected'] ?? 0,
      avgSalary: salaryAgg._avg.salaryPackage ?? 0,
    };
  },

  getPublicSummary: async () => {
    const [groups, salaryAgg, companyCount] = await Promise.all([
      prisma.placement.groupBy({
        by:    ['status'],
        _count: { id: true },
      }),
      prisma.placement.aggregate({
        where: { salaryPackage: { not: null } },
        _avg:  { salaryPackage: true },
      }),
      prisma.placement.findMany({
        distinct: ['companyId'],
        select:   { companyId: true },
      }),
    ]);

    const countMap    = groups.reduce((acc, g) => { acc[g.status] = g._count.id; return acc; }, {} as Record<string, number>);
    const totalPlaced = groups.reduce((s, g) => s + g._count.id, 0);
    const joined      = countMap['joined'] ?? 0;
    const placementRate = totalPlaced > 0 ? Math.round((joined / totalPlaced) * 100) : 0;

    console.log(`[PlacementService] Public summary fetched — total=${totalPlaced}`);
    return {
      totalPlaced,
      companiesHired: companyCount.length,
      avgSalaryLpa:   Math.round((salaryAgg._avg.salaryPackage ?? 0) * 10) / 10,
      placementRate,
    };
  },
};

