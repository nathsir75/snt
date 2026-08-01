import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { hasGlobalScope } from '../../common/utils/scope.util';

const BATCH_TRAINER_SELECT = {
  id: true,
  isPrimary: true,
  assignedAt: true,
  trainer: { select: { id: true, fullName: true, email: true, specialization: true, isActive: true } },
  batch:   { select: { id: true, name: true, branch: { select: { id: true, name: true } } } },
};

function assertBranchAccess(user: AuthPayload, branchId: number, ctx: string): void {
  if (!hasGlobalScope(user) && branchId !== user.branchId) {
    console.warn(`[BatchTrainerService] Branch access denied on ${ctx} — user branchId=${user.branchId}`);
    throw new Error('ACCESS_DENIED');
  }
}

export const batchTrainerService = {
  assignTrainer: async (
    user: AuthPayload,
    data: { batchId: number; trainerId: number; isPrimary?: boolean },
  ) => {
    const [batch, trainer] = await Promise.all([
      prisma.batch.findUnique({ where: { id: data.batchId } }),
      prisma.trainer.findUnique({ where: { id: data.trainerId } }),
    ]);

    if (!batch)   throw new Error('BATCH_NOT_FOUND');
    if (!trainer) throw new Error('TRAINER_NOT_FOUND');

    assertBranchAccess(user, batch.branchId, `batch id=${data.batchId}`);

    if (batch.branchId !== trainer.branchId) {
      console.warn(`[BatchTrainerService] Cross-branch assignment denied — batch branchId=${batch.branchId}, trainer branchId=${trainer.branchId}`);
      throw new Error('BRANCH_MISMATCH');
    }

    if (!trainer.isActive) throw new Error('TRAINER_INACTIVE');

    const dup = await prisma.batchTrainer.findUnique({
      where: { batchId_trainerId: { batchId: data.batchId, trainerId: data.trainerId } },
    });
    if (dup) {
      console.warn(`[BatchTrainerService] Duplicate assignment — trainerId=${data.trainerId} already in batchId=${data.batchId}`);
      throw new Error('ALREADY_ASSIGNED');
    }

    const assignment = await prisma.batchTrainer.create({
      data: {
        batchId:   data.batchId,
        trainerId: data.trainerId,
        isPrimary: data.isPrimary ?? true,
      },
      select: BATCH_TRAINER_SELECT,
    });

    console.log(`[BatchTrainerService] Trainer id=${data.trainerId} assigned to batch id=${data.batchId}, isPrimary=${data.isPrimary ?? true}`);
    return assignment;
  },

  getTrainersByBatch: async (batchId: number, user: AuthPayload) => {
    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('BATCH_NOT_FOUND');
    assertBranchAccess(user, batch.branchId, `batch id=${batchId}`);

    return prisma.batchTrainer.findMany({
      where: { batchId },
      orderBy: { isPrimary: 'desc' },
      select: BATCH_TRAINER_SELECT,
    });
  },

  getBatchesByTrainer: async (trainerId: number, user: AuthPayload) => {
    const trainer = await prisma.trainer.findUnique({ where: { id: trainerId } });
    if (!trainer) throw new Error('TRAINER_NOT_FOUND');
    assertBranchAccess(user, trainer.branchId, `trainer id=${trainerId}`);

    return prisma.batchTrainer.findMany({
      where: { trainerId },
      orderBy: { assignedAt: 'desc' },
      select: BATCH_TRAINER_SELECT,
    });
  },
};

