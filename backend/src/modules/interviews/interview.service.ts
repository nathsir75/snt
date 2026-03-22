import prisma from '../../db/prisma';

const VALID_MODES = ['online', 'offline'] as const;

const INTERVIEW_SELECT = {
  id:            true,
  interviewDate: true,
  mode:          true,
  location:      true,
  createdAt:     true,
  updatedAt:     true,
  jobOpening: {
    select: {
      id:    true,
      title: true,
      company: { select: { id: true, name: true } },
    },
  },
  branch: { select: { id: true, name: true, city: true } },
  _count: { select: { applications: true } },
};

export const interviewService = {
  schedule: async (data: {
    jobOpeningId:  number;
    interviewDate: string;
    mode:          string;
    location?:     string;
    branchId?:     number;
  }) => {
    if (!VALID_MODES.includes(data.mode as any)) throw new Error('INVALID_INTERVIEW_MODE');

    const job = await prisma.jobOpening.findUnique({ where: { id: data.jobOpeningId } });
    if (!job) throw new Error('JOB_OPENING_NOT_FOUND');
    if (job.status === 'closed') throw new Error('JOB_OPENING_CLOSED');

    const interview = await prisma.interview.create({
      data: {
        jobOpeningId:  data.jobOpeningId,
        interviewDate: new Date(data.interviewDate),
        mode:          data.mode,
        location:      data.location ?? null,
        branchId:      data.branchId ?? null,
      },
      select: INTERVIEW_SELECT,
    });
    console.log(`[InterviewService] Interview scheduled — id=${interview.id}, jobOpeningId=${data.jobOpeningId}`);
    return interview;
  },

  list: async (filters: { jobOpeningId?: number; branchId?: number }) => {
    const where: Record<string, unknown> = {};
    if (filters.jobOpeningId) where['jobOpeningId'] = filters.jobOpeningId;
    if (filters.branchId)     where['branchId']     = filters.branchId;
    return prisma.interview.findMany({
      where,
      orderBy: { interviewDate: 'desc' },
      select:  INTERVIEW_SELECT,
    });
  },

  getById: async (id: number) => {
    const interview = await prisma.interview.findUnique({ where: { id }, select: INTERVIEW_SELECT });
    if (!interview) throw new Error('INTERVIEW_NOT_FOUND');
    return interview;
  },
};
