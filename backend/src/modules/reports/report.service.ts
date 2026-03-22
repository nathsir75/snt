import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { getBranchFilter, isSuperAdmin } from '../../common/utils/scope.util';

function toDateOnly(raw: string | Date): Date {
  const d = new Date(raw);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function assertBranchAccess(user: AuthPayload, branchId: number): void {
  if (!isSuperAdmin(user.role) && branchId !== user.branchId) {
    console.warn(`[ReportService] Branch access denied — user branchId=${user.branchId}, resource branchId=${branchId}`);
    throw new Error('ACCESS_DENIED');
  }
}

function parseDateRange(fromDate?: string, toDate?: string): { gte?: Date; lte?: Date } | undefined {
  if (!fromDate && !toDate) return undefined;

  const range: { gte?: Date; lte?: Date } = {};

  if (fromDate) {
    const d = toDateOnly(fromDate);
    if (isNaN(d.getTime())) throw new Error('INVALID_DATE_RANGE');
    range.gte = d;
  }
  if (toDate) {
    const d = toDateOnly(toDate);
    if (isNaN(d.getTime())) throw new Error('INVALID_DATE_RANGE');
    // include the full toDate day
    d.setUTCHours(23, 59, 59, 999);
    range.lte = d;
  }
  if (range.gte && range.lte && range.gte > range.lte) {
    throw new Error('INVALID_DATE_RANGE');
  }

  return range;
}

export const reportService = {
  // ─── 1. Branch Dashboard ────────────────────────────────────────────────────
  getBranchDashboard: async (user: AuthPayload) => {
    const branchId = user.branchId as number;
    console.log(`[ReportService] Branch dashboard — branchId=${branchId}`);

    const todayStart = toDateOnly(new Date());
    const todayEnd   = new Date(todayStart);
    todayEnd.setUTCHours(23, 59, 59, 999);

    const [
      totalStudents,
      activeBatches,
      enquiryStats,
      feeAgg,
      studentFees,
      todayAttendance,
    ] = await Promise.all([
      // total students in branch
      prisma.student.count({ where: { branchId } }),

      // active batches
      prisma.batch.count({ where: { branchId, isActive: true } }),

      // enquiry counts grouped by status
      prisma.enquiry.groupBy({
        by: ['status'],
        where: { branchId },
        _count: { id: true },
      }),

      // total collected fees
      prisma.feePayment.aggregate({
        where: { branchId },
        _sum: { amount: true },
      }),

      // sum of finalFees for all students (to compute pending)
      prisma.student.aggregate({
        where: { branchId },
        _sum: { finalFees: true },
      }),

      // today's attendance
      prisma.attendance.groupBy({
        by: ['status'],
        where: {
          branchId,
          attendanceDate: { gte: todayStart, lte: todayEnd },
        },
        _count: { id: true },
      }),
    ]);

    const totalEnquiries    = enquiryStats.reduce((s, g) => s + g._count.id, 0);
    const convertedEnquiries = enquiryStats.find((g) => g.status === 'converted')?._count.id ?? 0;

    const totalCollectedFees = feeAgg._sum.amount ?? 0;
    const totalFinalFees     = studentFees._sum.finalFees ?? 0;
    const pendingFees        = Math.max(0, totalFinalFees - totalCollectedFees);

    const attendanceMap = todayAttendance.reduce((acc, g) => {
      acc[g.status] = g._count.id;
      return acc;
    }, {} as Record<string, number>);

    console.log(`[ReportService] Branch dashboard fetched — branchId=${branchId}`);

    return {
      branchId,
      totalStudents,
      activeBatches,
      totalEnquiries,
      convertedEnquiries,
      totalCollectedFees,
      pendingFees,
      attendanceToday: {
        present: attendanceMap['present'] ?? 0,
        absent:  attendanceMap['absent']  ?? 0,
        leave:   attendanceMap['leave']   ?? 0,
      },
    };
  },

  // ─── 2. Overall Dashboard (super_admin) ─────────────────────────────────────
  getOverallDashboard: async () => {
    console.log(`[ReportService] Overall dashboard requested`);

    const [
      totalBranches,
      totalStudents,
      totalEnquiries,
      feeAgg,
      studentFeeAgg,
      branchFeeGroups,
      allBranches,
    ] = await Promise.all([
      prisma.branch.count(),
      prisma.student.count(),
      prisma.enquiry.count(),

      prisma.feePayment.aggregate({ _sum: { amount: true } }),
      prisma.student.aggregate({ _sum: { finalFees: true } }),

      // per-branch fee collections
      prisma.feePayment.groupBy({
        by: ['branchId'],
        _sum: { amount: true },
      }),

      // all branches for name lookup
      prisma.branch.findMany({ select: { id: true, name: true } }),
    ]);

    // per-branch student counts
    const branchStudentGroups = await prisma.student.groupBy({
      by: ['branchId'],
      _count: { id: true },
    });

    const studentCountMap = new Map(branchStudentGroups.map((g) => [g.branchId, g._count.id]));
    const feeMap          = new Map(branchFeeGroups.map((g) => [g.branchId, g._sum.amount ?? 0]));

    const branchWiseStats = allBranches.map((b) => ({
      branchId:    b.id,
      branchName:  b.name,
      students:    studentCountMap.get(b.id) ?? 0,
      collections: feeMap.get(b.id) ?? 0,
    }));

    const totalCollectedFees = feeAgg._sum.amount ?? 0;
    const totalFinalFees     = studentFeeAgg._sum.finalFees ?? 0;
    const pendingFees        = Math.max(0, totalFinalFees - totalCollectedFees);

    console.log(`[ReportService] Overall dashboard fetched — branches=${totalBranches}`);

    return {
      totalBranches,
      totalStudents,
      totalEnquiries,
      totalCollectedFees,
      pendingFees,
      branchWiseStats,
    };
  },

  // ─── 3. Student Lifecycle Report (super_admin) ──────────────────────────────
  getStudentLifecycle: async () => {
    console.log(`[ReportService] Student lifecycle report requested`);

    const [enquiryGroups, studentGroups] = await Promise.all([
      prisma.enquiry.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.student.groupBy({
        by: ['course'],   // we need total, not by course — use aggregate instead
        _count: { id: true },
      }),
    ]);

    // Simpler: just aggregate students directly
    const [totalStudents, enquiryTotal] = await Promise.all([
      prisma.student.count(),
      prisma.enquiry.count(),
    ]);

    const enquiryMap = enquiryGroups.reduce((acc, g) => {
      acc[g.status] = g._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Students with at least one active batch assignment = active
    const activeStudentIds = await prisma.batchStudent.groupBy({
      by: ['studentId'],
      where: { status: 'active' },
    });

    console.log(`[ReportService] Student lifecycle fetched`);

    return {
      newEnquiries:        enquiryMap['new']       ?? 0,
      convertedToStudents: enquiryMap['converted'] ?? 0,
      activeStudents:      activeStudentIds.length,
      completedStudents:   0,   // extend when Student model has a status field
      droppedStudents:     0,   // extend when Student model has a status field
    };
  },

  // ─── 4. Attendance Report by Batch ──────────────────────────────────────────
  getAttendanceReport: async (batchId: number, user: AuthPayload) => {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { id: true, name: true, branchId: true, _count: { select: { batchStudents: true } } },
    });
    if (!batch) throw new Error('BATCH_NOT_FOUND');
    assertBranchAccess(user, batch.branchId);

    // All attendance records for this batch grouped by studentId + status
    const [allGroups, presentGroups, absentGroups, leaveGroups] = await Promise.all([
      prisma.attendance.groupBy({ by: ['studentId'], where: { batchId }, _count: { id: true } }),
      prisma.attendance.groupBy({ by: ['studentId'], where: { batchId, status: 'present' }, _count: { id: true } }),
      prisma.attendance.groupBy({ by: ['studentId'], where: { batchId, status: 'absent'  }, _count: { id: true } }),
      prisma.attendance.groupBy({ by: ['studentId'], where: { batchId, status: 'leave'   }, _count: { id: true } }),
    ]);

    const totalMap   = new Map(allGroups.map((g)     => [g.studentId, g._count.id]));
    const presentMap = new Map(presentGroups.map((g) => [g.studentId, g._count.id]));
    const absentMap  = new Map(absentGroups.map((g)  => [g.studentId, g._count.id]));
    const leaveMap   = new Map(leaveGroups.map((g)   => [g.studentId, g._count.id]));

    const studentIds = [...totalMap.keys()];
    const students   = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, fullName: true },
    });
    const studentMap = new Map(students.map((s) => [s.id, s.fullName]));

    const attendanceStats = studentIds.map((sid) => {
      const total   = totalMap.get(sid)   ?? 0;
      const present = presentMap.get(sid) ?? 0;
      const absent  = absentMap.get(sid)  ?? 0;
      const leave   = leaveMap.get(sid)   ?? 0;
      return {
        studentId:  sid,
        fullName:   studentMap.get(sid) ?? 'Unknown',
        present,
        absent,
        leave,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    });

    console.log(`[ReportService] Attendance report fetched — batchId=${batchId}, students=${studentIds.length}`);

    return {
      batchId,
      batchName:     batch.name,
      totalStudents: batch._count.batchStudents,
      attendanceStats,
    };
  },

  // ─── 5. Fee Collection Report ───────────────────────────────────────────────
  getFeeCollectionReport: async (user: AuthPayload, fromDate?: string, toDate?: string) => {
    const dateRange = parseDateRange(fromDate, toDate);
    const branchFilter = getBranchFilter(user);

    const where: Record<string, unknown> = { ...branchFilter };
    if (dateRange) where['paymentDate'] = dateRange;

    const [aggregate, dailyGroups] = await Promise.all([
      prisma.feePayment.aggregate({
        where,
        _sum:   { amount: true },
        _count: { id: true },
      }),

      // Group by date — use raw query for date truncation
      prisma.feePayment.findMany({
        where,
        select: { paymentDate: true, amount: true },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    // Aggregate daily totals in-memory (avoids DB-specific date_trunc syntax)
    const dailyMap = new Map<string, number>();
    for (const p of dailyGroups) {
      const key = toDateOnly(p.paymentDate).toISOString().split('T')[0];
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + p.amount);
    }

    const dailyCollection = [...dailyMap.entries()].map(([date, amount]) => ({ date, amount }));

    console.log(`[ReportService] Fee collection report — from=${fromDate}, to=${toDate}, total=${aggregate._sum.amount ?? 0}`);

    return {
      totalCollected:    aggregate._sum.amount ?? 0,
      totalTransactions: aggregate._count.id,
      dailyCollection,
    };
  },

  // ─── 6. Enquiry Funnel Report (super_admin) ──────────────────────────────────
  getEnquiryFunnel: async () => {
    console.log(`[ReportService] Enquiry funnel report requested`);

    const groups = await prisma.enquiry.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const map = groups.reduce((acc, g) => {
      acc[g.status] = g._count.id;
      return acc;
    }, {} as Record<string, number>);

    const totalEnquiries = groups.reduce((s, g) => s + g._count.id, 0);

    console.log(`[ReportService] Enquiry funnel fetched — total=${totalEnquiries}`);

    return {
      totalEnquiries,
      contacted:  map['contacted']  ?? 0,
      converted:  map['converted']  ?? 0,
      lost:       map['lost']       ?? 0,
    };
  },
};
