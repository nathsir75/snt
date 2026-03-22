import prisma from '../../db/prisma';

// ─── Shared date helpers ──────────────────────────────────────────────────────

function todayRange(): { gte: Date; lte: Date } {
  const now = new Date();
  const gte = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const lte = new Date(gte);
  lte.setUTCHours(23, 59, 59, 999);
  return { gte, lte };
}

// ─── Shared branch metric builder (reused by branch-health and branch-detail) ─

async function buildBranchMetrics(branchId: number) {
  const today = todayRange();

  const [
    totalStudents,
    placedStudents,
    certifiedStudents,
    feeCollected,
    studentFeeSum,
    discountPending,
    activeBatches,
    trainers,
    attendanceToday,
    totalEnquiries,
    enquiryGroups,
    followUpsDue,
    eligibilityPending,
    registrations,
    resultsPublished,
  ] = await Promise.all([
    prisma.student.count({ where: { branchId } }),
    prisma.placement.count({ where: { student: { branchId }, status: 'joined' } }),
    prisma.certificateIssue.count({ where: { branchId } }),
    prisma.feePayment.aggregate({ where: { branchId }, _sum: { amount: true } }),
    prisma.student.aggregate({ where: { branchId }, _sum: { finalFees: true } }),
    prisma.discountRequest.count({ where: { branchId, status: 'pending' } }),
    prisma.batch.count({ where: { branchId, isActive: true } }),
    prisma.trainer.count({ where: { branchId, isActive: true } }),
    prisma.attendance.groupBy({
      by: ['status'],
      where: { branchId, attendanceDate: today },
      _count: { id: true },
    }),
    prisma.enquiry.count({ where: { branchId } }),
    prisma.enquiry.groupBy({
      by: ['status'],
      where: { branchId },
      _count: { id: true },
    }),
    prisma.enquiryFollowUp.count({
      where: {
        branchId,
        nextFollowUpDate: { lte: today.lte },
        enquiry: { status: { notIn: ['converted', 'lost'] } },
      },
    }),
    prisma.examEligibilityRequest.count({ where: { branchId, status: 'pending' } }),
    prisma.finalExamRegistration.count({ where: { branchId } }),
    prisma.finalExamResult.count({ where: { branchId } }),
  ]);

  const collected = feeCollected._sum.amount ?? 0;
  const pending   = Math.max(0, (studentFeeSum._sum.finalFees ?? 0) - collected);

  const enquiryMap = enquiryGroups.reduce<Record<string, number>>((acc, g) => {
    acc[g.status] = g._count.id;
    return acc;
  }, {});

  const attMap = attendanceToday.reduce<Record<string, number>>((acc, g) => {
    acc[g.status] = g._count.id;
    return acc;
  }, {});

  return {
    branchId,
    students: {
      total:     totalStudents,
      placed:    placedStudents,
      certified: certifiedStudents,
    },
    finance: {
      collected,
      pending,
      discountRequestsPending: discountPending,
    },
    operations: {
      activeBatches,
      trainers,
      attendanceToday: {
        present: attMap['present'] ?? 0,
        absent:  attMap['absent']  ?? 0,
        leave:   attMap['leave']   ?? 0,
      },
    },
    crm: {
      totalEnquiries,
      followUpsDue,
      converted: enquiryMap['converted'] ?? 0,
    },
    exams: {
      eligibilityPending,
      registrations,
      resultsPublished,
    },
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const kpiDashboardService = {

  // ─── 1. Super Admin Master Dashboard ───────────────────────────────────────
  getSuperAdminDashboard: async () => {
    console.log('[KpiDashboard] Super admin dashboard requested');

    const today = todayRange();

    const [
      totalBranches,
      activeBranches,
      totalStudents,
      totalEnquiries,
      totalPlacements,
      totalCertificates,
      feeCollectedAgg,
      studentFeeAgg,
      discountPending,
      activeBatches,
      trainers,
      attendanceToday,
      examEligibilityPending,
      scheduledExams,
      resultsPublished,
      followUpsDue,
      enquiryGroups,
      openJobOpenings,
      interviewsScheduled,
      studentsSelected,
      studentsJoined,
      salaryAgg,
    ] = await Promise.all([
      prisma.branch.count(),
      prisma.branch.count({ where: { status: 'active' } }),
      prisma.student.count(),
      prisma.enquiry.count(),
      prisma.placement.count(),
      prisma.certificateIssue.count(),
      prisma.feePayment.aggregate({ _sum: { amount: true } }),
      prisma.student.aggregate({ _sum: { finalFees: true } }),
      prisma.discountRequest.count({ where: { status: 'pending' } }),
      prisma.batch.count({ where: { isActive: true } }),
      prisma.trainer.count({ where: { isActive: true } }),
      prisma.attendance.groupBy({
        by: ['status'],
        where: { attendanceDate: today },
        _count: { id: true },
      }),
      prisma.examEligibilityRequest.count({ where: { status: 'pending' } }),
      prisma.finalExamRegistration.count({ where: { status: { not: 'absent' } } }),
      prisma.finalExamResult.count(),
      prisma.enquiryFollowUp.count({
        where: {
          nextFollowUpDate: { lte: today.lte },
          enquiry: { status: { notIn: ['converted', 'lost'] } },
        },
      }),
      prisma.enquiry.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.jobOpening.count({ where: { status: 'open' } }),
      prisma.interview.count({ where: { interviewDate: { gte: today.gte } } }),
      prisma.interviewApplication.count({ where: { status: 'selected' } }),
      prisma.placement.count({ where: { status: 'joined' } }),
      prisma.placement.aggregate({
        where: { salaryPackage: { not: null } },
        _avg: { salaryPackage: true },
      }),
    ]);

    const collected   = feeCollectedAgg._sum.amount ?? 0;
    const pendingFees = Math.max(0, (studentFeeAgg._sum.finalFees ?? 0) - collected);

    const enquiryMap = enquiryGroups.reduce<Record<string, number>>((acc, g) => {
      acc[g.status] = g._count.id;
      return acc;
    }, {});

    const attMap = attendanceToday.reduce<Record<string, number>>((acc, g) => {
      acc[g.status] = g._count.id;
      return acc;
    }, {});

    console.log(`[KpiDashboard] Super admin dashboard fetched — branches=${totalBranches}, students=${totalStudents}`);

    return {
      organizationOverview: {
        totalBranches,
        activeBranches,
        totalStudents,
        totalEnquiries,
        totalPlacements,
        totalCertificatesIssued: totalCertificates,
      },
      financeOverview: {
        totalCollectedFees:      collected,
        pendingFees,
        discountRequestsPending: discountPending,
      },
      academicOverview: {
        activeBatches,
        trainers,
        attendanceToday: {
          present: attMap['present'] ?? 0,
          absent:  attMap['absent']  ?? 0,
          leave:   attMap['leave']   ?? 0,
        },
        examEligibilityPending,
        scheduledExams,
        resultsPublished,
      },
      crmOverview: {
        followUpsDue,
        newEnquiries:       enquiryMap['new']       ?? 0,
        convertedEnquiries: enquiryMap['converted'] ?? 0,
        lostEnquiries:      enquiryMap['lost']      ?? 0,
      },
      placementOverview: {
        openJobOpenings,
        interviewsScheduled,
        studentsSelected,
        studentsJoined,
        avgSalary: salaryAgg._avg.salaryPackage ?? null,
      },
    };
  },

  // ─── 2. Branch Health Dashboard ────────────────────────────────────────────
  getBranchHealth: async (branchId: number) => {
    console.log(`[KpiDashboard] Branch health requested — branchId=${branchId}`);
    const data = await buildBranchMetrics(branchId);
    console.log(`[KpiDashboard] Branch health fetched — branchId=${branchId}`);
    return data;
  },

  // ─── 3. Branch Ranking ─────────────────────────────────────────────────────
  getBranchRanking: async () => {
    console.log('[KpiDashboard] Branch ranking requested');

    const branches = await prisma.branch.findMany({
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });

    const branchIds = branches.map((b) => b.id);

    const [
      studentGroups,
      feeGroups,
      certGroups,
      enquiryGroups,
      placementsByBranch,
    ] = await Promise.all([
      prisma.student.groupBy({ by: ['branchId'], where: { branchId: { in: branchIds } }, _count: { id: true } }),
      prisma.feePayment.groupBy({ by: ['branchId'], where: { branchId: { in: branchIds } }, _sum: { amount: true } }),
      prisma.certificateIssue.groupBy({ by: ['branchId'], where: { branchId: { in: branchIds } }, _count: { id: true } }),
      prisma.enquiry.groupBy({ by: ['branchId', 'status'], where: { branchId: { in: branchIds } }, _count: { id: true } }),
      // Placement has no direct branchId — fetch via student relation and bucket in-memory
      prisma.placement.findMany({
        where: { student: { branchId: { in: branchIds } } },
        select: { student: { select: { branchId: true } } },
      }),
    ]);

    const studentMap   = new Map(studentGroups.map((g) => [g.branchId, g._count.id]));
    const feeMap       = new Map(feeGroups.map((g) => [g.branchId, g._sum.amount ?? 0]));
    const certMap      = new Map(certGroups.map((g) => [g.branchId, g._count.id]));

    const placementMap = new Map<number, number>();
    for (const p of placementsByBranch) {
      const bid = p.student.branchId;
      placementMap.set(bid, (placementMap.get(bid) ?? 0) + 1);
    }

    const conversionMap = new Map<number, number>();
    for (const g of enquiryGroups) {
      if (g.status === 'converted') {
        conversionMap.set(g.branchId, g._count.id);
      }
    }

    const rankings = branches.map((b) => {
      const students           = studentMap.get(b.id)    ?? 0;
      const collections        = feeMap.get(b.id)        ?? 0;
      const placements         = placementMap.get(b.id)  ?? 0;
      const certificates       = certMap.get(b.id)       ?? 0;
      const enquiryConversions = conversionMap.get(b.id) ?? 0;
      const score              = students + (placements * 5) + (certificates * 3) + (enquiryConversions * 2);
      return { branchId: b.id, branchName: b.name, students, collections, placements, certificates, enquiryConversions, score };
    });

    rankings.sort((a, b) => b.score - a.score);

    console.log(`[KpiDashboard] Branch ranking generated — branches=${rankings.length}`);
    return { rankings };
  },

  // ─── 4. Branch Detail Performance ──────────────────────────────────────────
  getBranchDetail: async (branchId: number) => {
    console.log(`[KpiDashboard] Branch detail requested — branchId=${branchId}`);

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, name: true, code: true, city: true, state: true, status: true, createdAt: true },
    });
    if (!branch) throw new Error('BRANCH_NOT_FOUND');

    const [metrics, totalPlacements, avgSalary] = await Promise.all([
      buildBranchMetrics(branchId),
      prisma.placement.count({ where: { student: { branchId } } }),
      prisma.placement.aggregate({
        where: { student: { branchId }, salaryPackage: { not: null } },
        _avg: { salaryPackage: true },
      }),
    ]);

    console.log(`[KpiDashboard] Branch detail fetched — branchId=${branchId}`);

    return {
      branch,
      students:  metrics.students,
      finance:   metrics.finance,
      crm:       metrics.crm,
      academics: {
        ...metrics.operations,
        ...metrics.exams,
      },
      placements: {
        total:     totalPlacements,
        joined:    metrics.students.placed,
        avgSalary: avgSalary._avg.salaryPackage ?? null,
      },
    };
  },

  // ─── 5. SaaS Control Summary ────────────────────────────────────────────────
  getSaasControl: async () => {
    console.log('[KpiDashboard] SaaS control summary requested');

    const [
      branches,
      users,
      roles,
      alertsUnread,
      pendingDiscountRequests,
      pendingExamEligibilityRequests,
      activeCourses,
      activeFeeStructures,
      activeDiscountPolicies,
      activeTrainers,
      openJobOpenings,
    ] = await Promise.all([
      prisma.branch.count(),
      prisma.user.count(),
      prisma.role.count(),
      prisma.alert.count({ where: { isRead: false } }),
      prisma.discountRequest.count({ where: { status: 'pending' } }),
      prisma.examEligibilityRequest.count({ where: { status: 'pending' } }),
      prisma.course.count({ where: { isActive: true } }),
      prisma.feeStructure.count({ where: { isActive: true } }),
      prisma.discountPolicy.count({ where: { isActive: true } }),
      prisma.trainer.count({ where: { isActive: true } }),
      prisma.jobOpening.count({ where: { status: 'open' } }),
    ]);

    console.log('[KpiDashboard] SaaS control summary fetched');

    return {
      totals: {
        branches,
        users,
        roles,
        alertsUnread,
        pendingDiscountRequests,
        pendingExamEligibilityRequests,
      },
      systemHealth: {
        activeCourses,
        activeFeeStructures,
        activeDiscountPolicies,
        activeTrainers,
        openJobOpenings,
      },
    };
  },

  // ─── 6. Monthly Trends ──────────────────────────────────────────────────────
  getMonthlyTrends: async (months: number) => {
    console.log(`[KpiDashboard] Monthly trends requested — months=${months}`);

    const cutoff = new Date();
    cutoff.setUTCDate(1);
    cutoff.setUTCHours(0, 0, 0, 0);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - (months - 1));

    const [enquiries, admissions, payments, placements] = await Promise.all([
      prisma.enquiry.findMany({
        where: { createdAt: { gte: cutoff } },
        select: { createdAt: true },
      }),
      prisma.student.findMany({
        where: { admissionDate: { gte: cutoff } },
        select: { admissionDate: true },
      }),
      prisma.feePayment.findMany({
        where: { paymentDate: { gte: cutoff } },
        select: { paymentDate: true, amount: true },
      }),
      prisma.placement.findMany({
        where: { createdAt: { gte: cutoff } },
        select: { createdAt: true },
      }),
    ]);

    function toMonthKey(d: Date): string {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }

    const monthKeys: string[] = [];
    const cursor = new Date(cutoff);
    const now    = new Date();
    while (cursor <= now) {
      monthKeys.push(toMonthKey(cursor));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    const enquiryMap    = new Map<string, number>(monthKeys.map((k) => [k, 0]));
    const admissionMap  = new Map<string, number>(monthKeys.map((k) => [k, 0]));
    const collectionMap = new Map<string, number>(monthKeys.map((k) => [k, 0]));
    const placementMap  = new Map<string, number>(monthKeys.map((k) => [k, 0]));

    for (const e of enquiries) {
      const k = toMonthKey(e.createdAt);
      enquiryMap.set(k, (enquiryMap.get(k) ?? 0) + 1);
    }
    for (const s of admissions) {
      const k = toMonthKey(s.admissionDate);
      admissionMap.set(k, (admissionMap.get(k) ?? 0) + 1);
    }
    for (const p of payments) {
      const k = toMonthKey(p.paymentDate);
      collectionMap.set(k, (collectionMap.get(k) ?? 0) + p.amount);
    }
    for (const p of placements) {
      const k = toMonthKey(p.createdAt);
      placementMap.set(k, (placementMap.get(k) ?? 0) + 1);
    }

    console.log(`[KpiDashboard] Monthly trends generated — months=${months}, buckets=${monthKeys.length}`);

    return {
      enquiries:   monthKeys.map((month) => ({ month, count:  enquiryMap.get(month)    ?? 0 })),
      admissions:  monthKeys.map((month) => ({ month, count:  admissionMap.get(month)  ?? 0 })),
      collections: monthKeys.map((month) => ({ month, amount: collectionMap.get(month) ?? 0 })),
      placements:  monthKeys.map((month) => ({ month, count:  placementMap.get(month)  ?? 0 })),
    };
  },
};
