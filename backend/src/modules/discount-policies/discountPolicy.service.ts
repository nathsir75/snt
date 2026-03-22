import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { isSuperAdmin } from '../../common/utils/scope.util';

const POLICY_SELECT = {
  id: true,
  name: true,
  description: true,
  maxDiscountAmount: true,
  maxDiscountPercent: true,
  requiresApprovalAboveAmount: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  course: { select: { id: true, name: true, code: true } },
};

export const discountPolicyService = {
  createPolicy: async (data: {
    name: string;
    description?: string;
    courseId?: number;
    maxDiscountAmount: number;
    maxDiscountPercent?: number;
    requiresApprovalAboveAmount?: number;
  }) => {
    if (data.maxDiscountAmount <= 0) throw new Error('INVALID_MAX_DISCOUNT_AMOUNT');
    if (data.maxDiscountPercent !== undefined && data.maxDiscountPercent < 0) throw new Error('INVALID_MAX_DISCOUNT_PERCENT');
    if (data.requiresApprovalAboveAmount !== undefined && data.requiresApprovalAboveAmount < 0) throw new Error('INVALID_APPROVAL_THRESHOLD');

    if (data.courseId) {
      const course = await prisma.course.findUnique({ where: { id: data.courseId } });
      if (!course) throw new Error('COURSE_NOT_FOUND');
    }

    const policy = await prisma.discountPolicy.create({
      data: {
        name:                        data.name,
        description:                 data.description ?? null,
        courseId:                    data.courseId ?? null,
        maxDiscountAmount:           data.maxDiscountAmount,
        maxDiscountPercent:          data.maxDiscountPercent ?? null,
        requiresApprovalAboveAmount: data.requiresApprovalAboveAmount ?? null,
      },
      select: POLICY_SELECT,
    });

    console.log(`[DiscountPolicyService] Policy created: "${policy.name}", maxAmount=${data.maxDiscountAmount}`);
    return policy;
  },

  getAllPolicies: async (user: AuthPayload) => {
    const filter = isSuperAdmin(user.role) ? {} : { isActive: true };
    if (!isSuperAdmin(user.role)) {
      console.log(`[DiscountPolicyService] Active-only filter for role: ${user.role}`);
    }
    return prisma.discountPolicy.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      select: POLICY_SELECT,
    });
  },

  getPoliciesByCourse: async (courseId: number, user: AuthPayload) => {
    const courseFilter = isSuperAdmin(user.role) ? { id: courseId } : { id: courseId, isActive: true };
    const course = await prisma.course.findFirst({ where: courseFilter });
    if (!course) throw new Error('COURSE_NOT_FOUND');

    const filter = isSuperAdmin(user.role)
      ? { courseId }
      : { courseId, isActive: true };

    return prisma.discountPolicy.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      select: POLICY_SELECT,
    });
  },

  updatePolicy: async (
    id: number,
    data: {
      name?: string;
      description?: string;
      maxDiscountAmount?: number;
      maxDiscountPercent?: number;
      requiresApprovalAboveAmount?: number;
      isActive?: boolean;
    },
  ) => {
    const existing = await prisma.discountPolicy.findUnique({ where: { id } });
    if (!existing) throw new Error('POLICY_NOT_FOUND');

    if (data.maxDiscountAmount !== undefined && data.maxDiscountAmount <= 0) throw new Error('INVALID_MAX_DISCOUNT_AMOUNT');
    if (data.maxDiscountPercent !== undefined && data.maxDiscountPercent < 0) throw new Error('INVALID_MAX_DISCOUNT_PERCENT');
    if (data.requiresApprovalAboveAmount !== undefined && data.requiresApprovalAboveAmount < 0) throw new Error('INVALID_APPROVAL_THRESHOLD');

    const updated = await prisma.discountPolicy.update({
      where: { id },
      data: {
        ...(data.name                        !== undefined && { name: data.name }),
        ...(data.description                 !== undefined && { description: data.description }),
        ...(data.maxDiscountAmount           !== undefined && { maxDiscountAmount: data.maxDiscountAmount }),
        ...(data.maxDiscountPercent          !== undefined && { maxDiscountPercent: data.maxDiscountPercent }),
        ...(data.requiresApprovalAboveAmount !== undefined && { requiresApprovalAboveAmount: data.requiresApprovalAboveAmount }),
        ...(data.isActive                    !== undefined && { isActive: data.isActive }),
      },
      select: POLICY_SELECT,
    });

    console.log(`[DiscountPolicyService] Policy updated: id=${id}, isActive=${updated.isActive}`);
    return updated;
  },
};
