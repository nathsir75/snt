import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { isSuperAdmin } from '../../common/utils/scope.util';

const FEE_STRUCTURE_SELECT = {
  id: true,
  amount: true,
  registrationFee: true,
  isActive: true,
  effectiveFrom: true,
  createdAt: true,
  updatedAt: true,
  course: { select: { id: true, name: true, code: true, isActive: true } },
};

export const feeStructureService = {
  createFeeStructure: async (data: {
    courseId: number;
    amount: number;
    registrationFee?: number;
    effectiveFrom?: string;
  }) => {
    if (data.amount <= 0) throw new Error('INVALID_AMOUNT');
    if ((data.registrationFee ?? 0) < 0) throw new Error('INVALID_REGISTRATION_FEE');

    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course) throw new Error('COURSE_NOT_FOUND');

    const feeStructure = await prisma.feeStructure.create({
      data: {
        courseId:        data.courseId,
        amount:          data.amount,
        registrationFee: data.registrationFee ?? 0,
        effectiveFrom:   data.effectiveFrom ? new Date(data.effectiveFrom) : new Date(),
      },
      select: FEE_STRUCTURE_SELECT,
    });

    console.log(`[FeeStructureService] Fee structure created: id=${feeStructure.id}, course=${course.name}, amount=${data.amount}`);
    return feeStructure;
  },

  getAllFeeStructures: async (user: AuthPayload) => {
    const filter = isSuperAdmin(user.role)
      ? {}
      : { isActive: true, course: { isActive: true } };

    if (!isSuperAdmin(user.role)) {
      console.log(`[FeeStructureService] Active-only filter applied for role: ${user.role}`);
    }

    return prisma.feeStructure.findMany({
      where: filter,
      orderBy: { effectiveFrom: 'desc' },
      select: FEE_STRUCTURE_SELECT,
    });
  },

  getFeeStructuresByCourse: async (courseId: number, user: AuthPayload) => {
    const courseFilter = isSuperAdmin(user.role)
      ? { id: courseId }
      : { id: courseId, isActive: true };

    const course = await prisma.course.findFirst({ where: courseFilter });
    if (!course) throw new Error('COURSE_NOT_FOUND');

    const filter = isSuperAdmin(user.role)
      ? { courseId }
      : { courseId, isActive: true };

    if (!isSuperAdmin(user.role)) {
      console.log(`[FeeStructureService] Active-only filter for courseId=${courseId}, role: ${user.role}`);
    }

    return prisma.feeStructure.findMany({
      where: filter,
      orderBy: { effectiveFrom: 'desc' },
      select: FEE_STRUCTURE_SELECT,
    });
  },

  updateFeeStructure: async (
    id: number,
    data: {
      amount?: number;
      registrationFee?: number;
      isActive?: boolean;
      effectiveFrom?: string;
    },
  ) => {
    const existing = await prisma.feeStructure.findUnique({ where: { id } });
    if (!existing) throw new Error('FEE_STRUCTURE_NOT_FOUND');

    if (data.amount !== undefined && data.amount <= 0) throw new Error('INVALID_AMOUNT');
    if (data.registrationFee !== undefined && data.registrationFee < 0) throw new Error('INVALID_REGISTRATION_FEE');

    const updated = await prisma.feeStructure.update({
      where: { id },
      data: {
        ...(data.amount          !== undefined && { amount: data.amount }),
        ...(data.registrationFee !== undefined && { registrationFee: data.registrationFee }),
        ...(data.isActive        !== undefined && { isActive: data.isActive }),
        ...(data.effectiveFrom   !== undefined && { effectiveFrom: new Date(data.effectiveFrom) }),
      },
      select: FEE_STRUCTURE_SELECT,
    });

    console.log(`[FeeStructureService] Fee structure updated: id=${id}, isActive=${updated.isActive}`);
    return updated;
  },
};
