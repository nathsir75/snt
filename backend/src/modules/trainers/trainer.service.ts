import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { getBranchFilter, isSuperAdmin } from '../../common/utils/scope.util';

const TRAINER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  mobile: true,
  specialization: true,
  trainerType: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  branch: { select: { id: true, name: true, city: true } },
};

function assertBranchAccess(user: AuthPayload, branchId: number): void {
  if (!isSuperAdmin(user.role) && branchId !== user.branchId) {
    console.warn(`[TrainerService] Branch access denied — user branchId=${user.branchId}, resource branchId=${branchId}`);
    throw new Error('ACCESS_DENIED');
  }
}

export const trainerService = {
  createTrainer: async (
    user: AuthPayload,
    data: { fullName: string; email?: string; mobile?: string; specialization?: string; branchId: number; trainerType?: string },
  ) => {
    assertBranchAccess(user, data.branchId);

    const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
    if (!branch) throw new Error('BRANCH_NOT_FOUND');

    if (data.email) {
      const dup = await prisma.trainer.findUnique({ where: { email: data.email } });
      if (dup) throw new Error('EMAIL_TAKEN');
    }

    const trainer = await prisma.trainer.create({
      data: {
        fullName:       data.fullName,
        email:          data.email ?? null,
        mobile:         data.mobile ?? null,
        specialization: data.specialization ?? null,
        trainerType:    data.trainerType ?? 'local',
        branchId:       data.branchId,
      },
      select: TRAINER_SELECT,
    });

    console.log(`[TrainerService] Trainer created: "${trainer.fullName}", branchId=${data.branchId}`);
    return trainer;
  },

  getAllTrainers: async (user: AuthPayload) => {
    const filter = getBranchFilter(user);
    return prisma.trainer.findMany({
      where: filter,
      orderBy: { fullName: 'asc' },
      select: TRAINER_SELECT,
    });
  },

  getTrainerById: async (id: number, user: AuthPayload) => {
    const trainer = await prisma.trainer.findUnique({ where: { id }, select: TRAINER_SELECT });
    if (!trainer) throw new Error('TRAINER_NOT_FOUND');
    assertBranchAccess(user, trainer.branch.id);
    return trainer;
  },

  updateTrainer: async (
    id: number,
    user: AuthPayload,
    data: { fullName?: string; email?: string; mobile?: string; specialization?: string; trainerType?: string; isActive?: boolean },
  ) => {
    const existing = await prisma.trainer.findUnique({ where: { id } });
    if (!existing) throw new Error('TRAINER_NOT_FOUND');
    assertBranchAccess(user, existing.branchId);

    if (data.email && data.email !== existing.email) {
      const dup = await prisma.trainer.findUnique({ where: { email: data.email } });
      if (dup) throw new Error('EMAIL_TAKEN');
    }

    const updated = await prisma.trainer.update({
      where: { id },
      data: {
        ...(data.fullName       !== undefined && { fullName: data.fullName }),
        ...(data.email          !== undefined && { email: data.email }),
        ...(data.mobile         !== undefined && { mobile: data.mobile }),
        ...(data.specialization !== undefined && { specialization: data.specialization }),
        ...(data.trainerType    !== undefined && { trainerType: data.trainerType }),
        ...(data.isActive       !== undefined && { isActive: data.isActive }),
      },
      select: TRAINER_SELECT,
    });

    console.log(`[TrainerService] Trainer updated: id=${id}, isActive=${updated.isActive}`);
    return updated;
  },
};
