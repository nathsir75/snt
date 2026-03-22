import prisma from '../../db/prisma';

const VALID_STATUSES = ['open', 'closed'] as const;

const JOB_SELECT = {
  id:             true,
  title:          true,
  description:    true,
  requiredSkills: true,
  salaryPackage:  true,
  location:       true,
  status:         true,
  createdAt:      true,
  updatedAt:      true,
  company: { select: { id: true, name: true, industry: true, location: true } },
};

export const jobOpeningService = {
  create: async (data: {
    companyId:      number;
    title:          string;
    description?:   string;
    requiredSkills?: string;
    salaryPackage?: number;
    location?:      string;
  }) => {
    const company = await prisma.company.findUnique({ where: { id: data.companyId } });
    if (!company) throw new Error('COMPANY_NOT_FOUND');

    const job = await prisma.jobOpening.create({
      data: {
        companyId:      data.companyId,
        title:          data.title,
        description:    data.description    ?? null,
        requiredSkills: data.requiredSkills ?? null,
        salaryPackage:  data.salaryPackage  ?? null,
        location:       data.location       ?? null,
      },
      select: JOB_SELECT,
    });
    console.log(`[JobOpeningService] Job opening created — id=${job.id}, title=${job.title}`);
    return job;
  },

  list: async (filters: { companyId?: number; status?: string }) => {
    const where: Record<string, unknown> = {};
    if (filters.companyId) where['companyId'] = filters.companyId;
    if (filters.status)    where['status']    = filters.status;
    return prisma.jobOpening.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select:  JOB_SELECT,
    });
  },

  getById: async (id: number) => {
    const job = await prisma.jobOpening.findUnique({ where: { id }, select: JOB_SELECT });
    if (!job) throw new Error('JOB_OPENING_NOT_FOUND');
    return job;
  },

  updateStatus: async (id: number, status: string) => {
    if (!VALID_STATUSES.includes(status as any)) throw new Error('INVALID_JOB_STATUS');
    const job = await prisma.jobOpening.findUnique({ where: { id } });
    if (!job) throw new Error('JOB_OPENING_NOT_FOUND');
    return prisma.jobOpening.update({ where: { id }, data: { status }, select: JOB_SELECT });
  },
};
