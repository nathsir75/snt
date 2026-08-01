import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { getBranchFilter, hasGlobalScope } from '../../common/utils/scope.util';
import { createBranchAlert } from '../alerts/alert.service';

const VALID_DECISIONS = ['approved', 'rejected'] as const;

const REQUEST_SELECT = {
  id: true,
  requestedDiscountAmount: true,
  reason: true,
  status: true,
  decisionRemarks: true,
  decidedAt: true,
  createdAt: true,
  updatedAt: true,
  branch:      { select: { id: true, name: true, city: true } },
  requestedBy: { select: { id: true, name: true } },
  decidedBy:   { select: { id: true, name: true } },
  enquiry:     { select: { id: true, fullName: true, mobile: true, courseInterest: true } },
  student:     { select: { id: true, fullName: true, mobile: true, course: true } },
  course:      { select: { id: true, name: true, code: true } },
};

async function resolveRequestBranchId(
  user: AuthPayload,
  enquiryId?: number,
  studentId?: number,
): Promise<number> {
  if (enquiryId) {
    const enquiry = await prisma.enquiry.findUnique({ where: { id: enquiryId } });
    if (!enquiry) throw new Error('ENQUIRY_NOT_FOUND');
    if (!hasGlobalScope(user) && enquiry.branchId !== user.branchId) {
      console.warn(`[DiscountRequestService] Branch mismatch on enquiry id=${enquiryId}`);
      throw new Error('ACCESS_DENIED');
    }
    return enquiry.branchId;
  }

  if (studentId) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new Error('STUDENT_NOT_FOUND');
    if (!hasGlobalScope(user) && student.branchId !== user.branchId) {
      console.warn(`[DiscountRequestService] Branch mismatch on student id=${studentId}`);
      throw new Error('ACCESS_DENIED');
    }
    return student.branchId;
  }

  // fallback: use user's own branchId (super_admin must provide enquiry/student)
  if (!user.branchId) throw new Error('BRANCH_CONTEXT_REQUIRED');
  return user.branchId;
}

async function matchPolicy(courseId?: number, amount?: number) {
  // 1. Try course-specific active policy first
  const coursePolicy = courseId
    ? await prisma.discountPolicy.findFirst({
        where: { courseId, isActive: true },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, maxDiscountAmount: true, maxDiscountPercent: true, requiresApprovalAboveAmount: true },
      })
    : null;

  // 2. Fall back to global active policy
  const globalPolicy = !coursePolicy
    ? await prisma.discountPolicy.findFirst({
        where: { courseId: null, isActive: true },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, maxDiscountAmount: true, maxDiscountPercent: true, requiresApprovalAboveAmount: true },
      })
    : null;

  const matched = coursePolicy ?? globalPolicy ?? null;
  const approvalRequired =
    matched && amount !== undefined && matched.requiresApprovalAboveAmount !== null
      ? amount > matched.requiresApprovalAboveAmount
      : null;

  return { matchedPolicy: matched, approvalRequired };
}

export const discountRequestService = {
  createRequest: async (
    user: AuthPayload,
    data: {
      enquiryId?: number;
      studentId?: number;
      courseId?: number;
      requestedDiscountAmount: number;
      reason: string;
    },
  ) => {
    if (!data.enquiryId && !data.studentId) throw new Error('ENQUIRY_OR_STUDENT_REQUIRED');
    if (data.requestedDiscountAmount <= 0) throw new Error('INVALID_AMOUNT');
    if (!data.reason?.trim()) throw new Error('REASON_REQUIRED');

    if (data.courseId) {
      const course = await prisma.course.findUnique({ where: { id: data.courseId } });
      if (!course) throw new Error('COURSE_NOT_FOUND');
    }

    const branchId = await resolveRequestBranchId(user, data.enquiryId, data.studentId);

    const request = await prisma.discountRequest.create({
      data: {
        enquiryId:               data.enquiryId ?? null,
        studentId:               data.studentId ?? null,
        branchId,
        requestedByUserId:       user.userId,
        courseId:                data.courseId ?? null,
        requestedDiscountAmount: data.requestedDiscountAmount,
        reason:                  data.reason,
      },
      select: REQUEST_SELECT,
    });

    const { matchedPolicy, approvalRequired } = await matchPolicy(data.courseId, data.requestedDiscountAmount);

    console.log(`[DiscountRequestService] Request created: id=${request.id}, amount=${data.requestedDiscountAmount}, branchId=${branchId}`);
    return { request, matchedPolicy, approvalRequired };
  },

  getAllRequests: async (user: AuthPayload) => {
    const filter = getBranchFilter(user);
    console.log(`[DiscountRequestService] Fetching requests with filter:`, filter);
    return prisma.discountRequest.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      select: REQUEST_SELECT,
    });
  },

  getRequestById: async (id: number, user: AuthPayload) => {
    const request = await prisma.discountRequest.findUnique({
      where: { id },
      select: REQUEST_SELECT,
    });
    if (!request) throw new Error('REQUEST_NOT_FOUND');

    if (!hasGlobalScope(user) && request.branch.id !== user.branchId) {
      console.warn(`[DiscountRequestService] Access denied on request id=${id}`);
      throw new Error('ACCESS_DENIED');
    }

    return request;
  },

  decideRequest: async (
    id: number,
    user: AuthPayload,
    data: { status: string; decisionRemarks?: string },
  ) => {
    if (!VALID_DECISIONS.includes(data.status as any)) throw new Error('INVALID_DECISION_STATUS');

    const request = await prisma.discountRequest.findUnique({ where: { id } });
    if (!request) throw new Error('REQUEST_NOT_FOUND');
    if (request.status !== 'pending') throw new Error('ALREADY_DECIDED');

    const updated = await prisma.discountRequest.update({
      where: { id },
      data: {
        status:          data.status,
        decisionRemarks: data.decisionRemarks ?? null,
        decidedByUserId: user.userId,
        decidedAt:       new Date(),
      },
      select: REQUEST_SELECT,
    });

    // Fire discount decision alert for the request's branch
    const decisionLabel = data.status === 'approved' ? 'approved' : 'rejected';
    createBranchAlert({
      type:       'discount_decision',
      title:      `Discount request ${decisionLabel}`,
      message:    `Discount request #${id} of ₹${request.requestedDiscountAmount} has been ${decisionLabel}`,
      branchId:   request.branchId,
      entityType: 'discount_request',
      entityId:   id,
      metadata:   { decision: data.status, decisionRemarks: data.decisionRemarks ?? null },
    }).catch((err) =>
      console.error(`[DiscountRequestService] Failed to create discount decision alert for request id=${id}:`, err),
    );

    console.log(`[DiscountRequestService] Request id=${id} ${data.status} by userId=${user.userId}`);
    return updated;
  },
};

