import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { getBranchFilter, hasGlobalScope } from '../../common/utils/scope.util';

const VALID_ACTION_TYPES      = ['call', 'whatsapp', 'email', 'visit', 'note'] as const;
const VALID_STATUS_AFTER      = ['contacted', 'follow_up', 'converted', 'lost'] as const;

const FOLLOWUP_SELECT = {
  id:               true,
  actionType:       true,
  remarks:          true,
  nextFollowUpDate: true,
  statusAfterAction: true,
  createdAt:        true,
  enquiry: {
    select: { id: true, fullName: true, mobile: true, courseInterest: true, status: true },
  },
  branch:    { select: { id: true, name: true, city: true } },
  createdBy: { select: { id: true, name: true } },
};

function assertBranchAccess(user: AuthPayload, branchId: number): void {
  if (!hasGlobalScope(user) && branchId !== user.branchId) {
    console.warn(
      `[FollowUpService] Branch access denied — user branchId=${user.branchId}, resource branchId=${branchId}`,
    );
    throw new Error('ACCESS_DENIED');
  }
}

function parseDateRange(
  fromDate?: string,
  toDate?: string,
): { gte?: Date; lte?: Date } | undefined {
  if (!fromDate && !toDate) return undefined;
  const range: { gte?: Date; lte?: Date } = {};
  if (fromDate) {
    const d = new Date(fromDate);
    if (isNaN(d.getTime())) throw new Error('INVALID_DATE_RANGE');
    range.gte = d;
  }
  if (toDate) {
    const d = new Date(toDate);
    if (isNaN(d.getTime())) throw new Error('INVALID_DATE_RANGE');
    d.setUTCHours(23, 59, 59, 999);
    range.lte = d;
  }
  if (range.gte && range.lte && range.gte > range.lte) throw new Error('INVALID_DATE_RANGE');
  return range;
}

export const enquiryFollowUpService = {
  // ─── 1. Create follow-up ────────────────────────────────────────────────────
  create: async (
    user: AuthPayload,
    data: {
      enquiryId:         number;
      actionType:        string;
      remarks:           string;
      nextFollowUpDate?: string;
      statusAfterAction?: string;
    },
  ) => {
    if (!VALID_ACTION_TYPES.includes(data.actionType as any)) throw new Error('INVALID_ACTION_TYPE');
    if (data.statusAfterAction && !VALID_STATUS_AFTER.includes(data.statusAfterAction as any)) {
      throw new Error('INVALID_STATUS_AFTER_ACTION');
    }

    const enquiry = await prisma.enquiry.findUnique({ where: { id: data.enquiryId } });
    if (!enquiry) throw new Error('ENQUIRY_NOT_FOUND');
    assertBranchAccess(user, enquiry.branchId);

    // Atomic: create follow-up + optionally update enquiry status
    const [followUp] = await prisma.$transaction(async (tx) => {
      const fu = await tx.enquiryFollowUp.create({
        data: {
          enquiryId:         data.enquiryId,
          branchId:          enquiry.branchId,
          actionType:        data.actionType,
          remarks:           data.remarks,
          nextFollowUpDate:  data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : null,
          statusAfterAction: data.statusAfterAction ?? null,
          createdByUserId:   user.userId,
        },
        select: FOLLOWUP_SELECT,
      });

      if (data.statusAfterAction) {
        await tx.enquiry.update({
          where: { id: data.enquiryId },
          data:  { status: data.statusAfterAction },
        });
        console.log(
          `[FollowUpService] Enquiry id=${data.enquiryId} status updated to "${data.statusAfterAction}" via follow-up`,
        );
      }

      return [fu];
    });

    console.log(
      `[FollowUpService] Follow-up created — enquiryId=${data.enquiryId}, action=${data.actionType}, by userId=${user.userId}`,
    );
    return followUp;
  },

  // ─── 2. List all follow-ups (branch-scoped) ─────────────────────────────────
  list: async (
    user: AuthPayload,
    filters: { enquiryId?: number; fromDate?: string; toDate?: string },
  ) => {
    const branchFilter = getBranchFilter(user);
    const dateRange    = parseDateRange(filters.fromDate, filters.toDate);

    const where: Record<string, unknown> = { ...branchFilter };
    if (filters.enquiryId) where['enquiryId'] = filters.enquiryId;
    if (dateRange)         where['createdAt'] = dateRange;

    console.log(`[FollowUpService] Listing follow-ups — filter:`, where);

    return prisma.enquiryFollowUp.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select:  FOLLOWUP_SELECT,
    });
  },

  // ─── 3. Follow-up history for one enquiry ───────────────────────────────────
  getByEnquiry: async (enquiryId: number, user: AuthPayload) => {
    const enquiry = await prisma.enquiry.findUnique({ where: { id: enquiryId } });
    if (!enquiry) throw new Error('ENQUIRY_NOT_FOUND');
    assertBranchAccess(user, enquiry.branchId);

    console.log(`[FollowUpService] Fetching history for enquiryId=${enquiryId}`);

    return prisma.enquiryFollowUp.findMany({
      where:   { enquiryId },
      orderBy: { createdAt: 'asc' },
      select:  FOLLOWUP_SELECT,
    });
  },

  // ─── 4. Due follow-ups (today + overdue) ────────────────────────────────────
  getDue: async (user: AuthPayload) => {
    const branchFilter = getBranchFilter(user);
    const now          = new Date();
    // End of today UTC
    const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    const where: Record<string, unknown> = {
      ...branchFilter,
      nextFollowUpDate: { lte: todayEnd },
      // Exclude enquiries already closed
      enquiry: { status: { notIn: ['converted', 'lost'] } },
    };

    console.log(`[FollowUpService] Fetching due follow-ups — cutoff=${todayEnd.toISOString()}`);

    return prisma.enquiryFollowUp.findMany({
      where,
      orderBy: { nextFollowUpDate: 'asc' },
      select:  FOLLOWUP_SELECT,
    });
  },

  // ─── 5. Summary ─────────────────────────────────────────────────────────────
  getSummary: async (user: AuthPayload) => {
    const branchFilter = getBranchFilter(user);
    const now          = new Date();
    const todayStart   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayEnd     = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    const [totalFollowUps, dueToday, overdue, actionBreakdown] = await Promise.all([
      // total follow-ups in scope
      prisma.enquiryFollowUp.count({ where: branchFilter }),

      // due today (nextFollowUpDate falls within today)
      prisma.enquiryFollowUp.count({
        where: {
          ...branchFilter,
          nextFollowUpDate: { gte: todayStart, lte: todayEnd },
        },
      }),

      // overdue (nextFollowUpDate is before today start, enquiry still open)
      prisma.enquiryFollowUp.count({
        where: {
          ...branchFilter,
          nextFollowUpDate: { lt: todayStart },
          enquiry: { status: { notIn: ['converted', 'lost'] } },
        },
      }),

      // breakdown by actionType
      prisma.enquiryFollowUp.groupBy({
        by:    ['actionType'],
        where: branchFilter,
        _count: { id: true },
      }),
    ]);

    const actionTypeBreakdown = actionBreakdown.map((g) => ({
      actionType: g.actionType,
      count:      g._count.id,
    }));

    console.log(`[FollowUpService] Summary fetched — total=${totalFollowUps}, dueToday=${dueToday}, overdue=${overdue}`);

    return { totalFollowUps, dueToday, overdue, actionTypeBreakdown };
  },
};

