import prisma from '../../db/prisma';
import { Prisma } from '@prisma/client';
import { AuthPayload } from '../../common/types';
import { isSuperAdmin } from '../../common/utils/scope.util';

const VALID_TYPES = ['followup_due', 'discount_decision', 'fee_due', 'system'] as const;
type AlertType = (typeof VALID_TYPES)[number];

const ALERT_SELECT = {
  id:           true,
  type:         true,
  title:        true,
  message:      true,
  isRead:       true,
  entityType:   true,
  entityId:     true,
  metadataJson: true,
  createdAt:    true,
  branch: { select: { id: true, name: true } },
  user:   { select: { id: true, name: true } },
};

// ─── Internal creation helpers ───────────────────────────────────────────────

export async function createBranchAlert(params: {
  type:        AlertType;
  title:       string;
  message:     string;
  branchId:    number;
  entityType?: string;
  entityId?:   number;
  metadata?:   Record<string, unknown>;
}) {
  const alert = await prisma.alert.create({
    data: {
      type:         params.type,
      title:        params.title,
      message:      params.message,
      branchId:     params.branchId,
      entityType:   params.entityType ?? null,
      entityId:     params.entityId   ?? null,
      metadataJson: (params.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });
  console.log(`[AlertService] Branch alert created — type=${params.type}, branchId=${params.branchId}, id=${alert.id}`);
  return alert;
}

export async function createUserAlert(params: {
  type:        AlertType;
  title:       string;
  message:     string;
  userId:      number;
  branchId?:   number;
  entityType?: string;
  entityId?:   number;
  metadata?:   Record<string, unknown>;
}) {
  const alert = await prisma.alert.create({
    data: {
      type:         params.type,
      title:        params.title,
      message:      params.message,
      userId:       params.userId,
      branchId:     params.branchId  ?? null,
      entityType:   params.entityType ?? null,
      entityId:     params.entityId   ?? null,
      metadataJson: (params.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });
  console.log(`[AlertService] User alert created — type=${params.type}, userId=${params.userId}, id=${alert.id}`);
  return alert;
}

// ─── Scope filter helper ──────────────────────────────────────────────────────

function buildScopeFilter(user: AuthPayload): Record<string, unknown> {
  if (isSuperAdmin(user.role)) return {};
  // branch_admin sees alerts for own branch OR targeted directly to them
  return {
    OR: [
      { branchId: user.branchId },
      { userId:   user.userId   },
    ],
  };
}

// ─── Public service ───────────────────────────────────────────────────────────

export const alertService = {
  // ─── 1. List alerts ─────────────────────────────────────────────────────────
  list: async (
    user: AuthPayload,
    filters: { isRead?: boolean; type?: string; branchId?: number },
  ) => {
    if (filters.type && !VALID_TYPES.includes(filters.type as AlertType)) {
      throw new Error('INVALID_ALERT_TYPE');
    }
    // branch_admin cannot filter by arbitrary branchId
    if (!isSuperAdmin(user.role) && filters.branchId && filters.branchId !== user.branchId) {
      throw new Error('ACCESS_DENIED');
    }

    const scopeFilter = buildScopeFilter(user);
    const where: Record<string, unknown> = { ...scopeFilter };

    if (filters.isRead !== undefined) where['isRead'] = filters.isRead;
    if (filters.type)                 where['type']   = filters.type;
    // super_admin optional branchId drill-down
    if (isSuperAdmin(user.role) && filters.branchId) where['branchId'] = filters.branchId;

    console.log(`[AlertService] Listing alerts — role=${user.role}, filters:`, filters);

    return prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select:  ALERT_SELECT,
    });
  },

  // ─── 2. Unread count ────────────────────────────────────────────────────────
  getUnreadCount: async (user: AuthPayload) => {
    const scopeFilter = buildScopeFilter(user);
    const count = await prisma.alert.count({
      where: { ...scopeFilter, isRead: false },
    });
    console.log(`[AlertService] Unread count fetched — userId=${user.userId}, count=${count}`);
    return { count };
  },

  // ─── 3. Mark as read ────────────────────────────────────────────────────────
  markRead: async (id: number, user: AuthPayload) => {
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new Error('ALERT_NOT_FOUND');

    // Verify the user can access this alert
    if (!isSuperAdmin(user.role)) {
      const accessible =
        (alert.branchId !== null && alert.branchId === user.branchId) ||
        (alert.userId   !== null && alert.userId   === user.userId);
      if (!accessible) throw new Error('ACCESS_DENIED');
    }

    const updated = await prisma.alert.update({
      where: { id },
      data:  { isRead: true },
      select: ALERT_SELECT,
    });

    console.log(`[AlertService] Alert id=${id} marked as read by userId=${user.userId}`);
    return updated;
  },

  // ─── 4. Summary ─────────────────────────────────────────────────────────────
  getSummary: async (user: AuthPayload) => {
    const scopeFilter = buildScopeFilter(user);

    const [total, unread, byType] = await Promise.all([
      prisma.alert.count({ where: scopeFilter }),
      prisma.alert.count({ where: { ...scopeFilter, isRead: false } }),
      prisma.alert.groupBy({
        by:    ['type'],
        where: scopeFilter,
        _count: { id: true },
      }),
    ]);

    return {
      total,
      unread,
      byType: byType.map((g) => ({ type: g.type, count: g._count.id })),
    };
  },

  // ─── 5. Generator: due follow-up alerts ─────────────────────────────────────
  generateDueFollowUpAlerts: async () => {
    const now      = new Date();
    const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    // Fetch due follow-ups for open enquiries
    const dueFollowUps = await prisma.enquiryFollowUp.findMany({
      where: {
        nextFollowUpDate: { lte: todayEnd },
        enquiry: { status: { notIn: ['converted', 'lost'] } },
      },
      select: {
        id:              true,
        enquiryId:       true,
        branchId:        true,
        nextFollowUpDate: true,
        enquiry: { select: { fullName: true } },
      },
    });

    if (dueFollowUps.length === 0) {
      console.log('[AlertService] No due follow-ups found — skipping alert generation');
      return { generated: 0, skipped: 0 };
    }

    // Dedup: find existing unread followup_due alerts for same entityId (enquiryId) created today
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const existingAlerts = await prisma.alert.findMany({
      where: {
        type:       'followup_due',
        entityType: 'enquiry',
        entityId:   { in: dueFollowUps.map((f) => f.enquiryId) },
        createdAt:  { gte: todayStart },
      },
      select: { entityId: true },
    });
    const alreadyAlerted = new Set(existingAlerts.map((a) => a.entityId));

    let generated = 0;
    let skipped   = 0;

    for (const fu of dueFollowUps) {
      if (alreadyAlerted.has(fu.enquiryId)) {
        console.log(`[AlertService] Duplicate prevented — followup_due for enquiryId=${fu.enquiryId}`);
        skipped++;
        continue;
      }

      const dueLabel = fu.nextFollowUpDate
        ? fu.nextFollowUpDate.toISOString().split('T')[0]
        : 'today';

      await createBranchAlert({
        type:       'followup_due',
        title:      'Follow-up due',
        message:    `Follow-up due for ${fu.enquiry.fullName} on ${dueLabel}`,
        branchId:   fu.branchId,
        entityType: 'enquiry',
        entityId:   fu.enquiryId,
        metadata:   { followUpId: fu.id, dueDate: dueLabel },
      });

      alreadyAlerted.add(fu.enquiryId); // prevent duplicates within same run
      generated++;
    }

    console.log(`[AlertService] Due follow-up alerts generated=${generated}, skipped=${skipped}`);
    return { generated, skipped };
  },

  // ─── 6. Generator: fee due alerts ───────────────────────────────────────────
  generateFeeDueAlerts: async () => {
    // Fetch all students with their total paid
    const students = await prisma.student.findMany({
      select: {
        id:         true,
        fullName:   true,
        branchId:   true,
        finalFees:  true,
        feePayments: { select: { amount: true } },
      },
    });

    const studentsWithDue = students
      .map((s) => ({
        ...s,
        totalPaid:    s.feePayments.reduce((sum, p) => sum + p.amount, 0),
        remainingDue: s.finalFees - s.feePayments.reduce((sum, p) => sum + p.amount, 0),
      }))
      .filter((s) => s.remainingDue > 0);

    if (studentsWithDue.length === 0) {
      console.log('[AlertService] No students with pending fees — skipping alert generation');
      return { generated: 0, skipped: 0 };
    }

    // Dedup: skip students already alerted today
    const now        = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const existingAlerts = await prisma.alert.findMany({
      where: {
        type:       'fee_due',
        entityType: 'student',
        entityId:   { in: studentsWithDue.map((s) => s.id) },
        createdAt:  { gte: todayStart },
      },
      select: { entityId: true },
    });
    const alreadyAlerted = new Set(existingAlerts.map((a) => a.entityId));

    let generated = 0;
    let skipped   = 0;

    for (const student of studentsWithDue) {
      if (alreadyAlerted.has(student.id)) {
        console.log(`[AlertService] Duplicate prevented — fee_due for studentId=${student.id}`);
        skipped++;
        continue;
      }

      await createBranchAlert({
        type:       'fee_due',
        title:      'Fee due pending',
        message:    `${student.fullName} has ₹${student.remainingDue.toFixed(2)} pending`,
        branchId:   student.branchId,
        entityType: 'student',
        entityId:   student.id,
        metadata:   { remainingDue: student.remainingDue, totalPaid: student.totalPaid },
      });

      alreadyAlerted.add(student.id);
      generated++;
    }

    console.log(`[AlertService] Fee due alerts generated=${generated}, skipped=${skipped}`);
    return { generated, skipped };
  },
};
