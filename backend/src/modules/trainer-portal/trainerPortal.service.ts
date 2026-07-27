import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { ROLES } from '../../common/roles';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const GLOBAL_TRAINER_TYPE = 'global';

const STUDENT_SELECT = {
  id: true,
  joinedAt: true,
  status: true,
  student: {
    select: {
      id: true,
      fullName: true,
      mobile: true,
      email: true,
      course: true,
      admissionDate: true,
      branch: { select: { id: true, name: true, city: true } },
    },
  },
};

async function resolveTrainerContext(user: AuthPayload) {
  if (user.role !== ROLES.TEACHER) throw new Error('ACCESS_DENIED');

  const account = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { id: true, name: true, email: true },
  });
  if (!account) throw new Error('USER_NOT_FOUND');

  const trainer = await prisma.trainer.findUnique({
    where: { email: account.email },
    select: {
      id: true,
      fullName: true,
      email: true,
      mobile: true,
      specialization: true,
      trainerType: true,
      isActive: true,
    },
  });
  if (!trainer) throw new Error('TRAINER_PROFILE_REQUIRED');
  if (!trainer.isActive) throw new Error('TRAINER_INACTIVE');
  if (trainer.trainerType !== GLOBAL_TRAINER_TYPE) throw new Error('GLOBAL_TRAINER_REQUIRED');

  const trainerAssignments = await prisma.batchTrainer.findMany({
    where: { trainerId: trainer.id },
    select: { batchId: true },
  });

  const batchIds = [...new Set(trainerAssignments.map((assignment) => assignment.batchId))];

  return { account, trainer, batchIds };
}

async function assertAssigned(user: AuthPayload, batchId: number): Promise<void> {
  const { batchIds } = await resolveTrainerContext(user);
  if (!batchIds.includes(batchId)) throw new Error('TEACHER_NOT_ASSIGNED');
}

function withDayNames<T extends { batchSchedules: Array<{ dayOfWeek: number }> }>(batch: T) {
  return {
    ...batch,
    batchSchedules: batch.batchSchedules.map((slot) => ({
      ...slot,
      dayName: DAY_NAMES[slot.dayOfWeek] ?? 'Day',
    })),
  };
}

export const trainerPortalService = {
  getSummary: async (user: AuthPayload) => {
    const { account, trainer, batchIds } = await resolveTrainerContext(user);

    const batches = await prisma.batch.findMany({
      where: { id: { in: batchIds } },
      orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        name: true,
        teamsJoinUrl: true,
        capacity: true,
        startDate: true,
        endDate: true,
        isActive: true,
        course: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true, city: true } },
        batchSchedules: {
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          select: { id: true, dayOfWeek: true, startTime: true, endTime: true, room: true },
        },
        batchStudents: {
          orderBy: { joinedAt: 'asc' },
          select: STUDENT_SELECT,
        },
        _count: { select: { batchStudents: true } },
      },
    });

    return {
      account,
      trainer,
      batches: batches.map((batch) => {
        const shaped = withDayNames(batch);
        return {
          ...shaped,
          activeStudents: shaped.batchStudents.filter((student) => student.status === 'active').length,
        };
      }),
    };
  },

  getStudentsByBatch: async (user: AuthPayload, batchId: number) => {
    await assertAssigned(user, batchId);

    return prisma.batchStudent.findMany({
      where: { batchId },
      orderBy: { joinedAt: 'asc' },
      select: STUDENT_SELECT,
    });
  },
};
