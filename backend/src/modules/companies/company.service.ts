import prisma from '../../db/prisma';

const COMPANY_SELECT = {
  id:            true,
  name:          true,
  industry:      true,
  contactPerson: true,
  contactEmail:  true,
  contactPhone:  true,
  location:      true,
  isActive:      true,
  createdAt:     true,
  updatedAt:     true,
};

export const companyService = {
  create: async (data: {
    name: string;
    industry?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
    location?: string;
  }) => {
    const company = await prisma.company.create({
      data: {
        name:          data.name,
        industry:      data.industry      ?? null,
        contactPerson: data.contactPerson ?? null,
        contactEmail:  data.contactEmail  ?? null,
        contactPhone:  data.contactPhone  ?? null,
        location:      data.location      ?? null,
      },
      select: COMPANY_SELECT,
    });
    console.log(`[CompanyService] Company created — id=${company.id}, name=${company.name}`);
    return company;
  },

  list: async (activeOnly = false) => {
    return prisma.company.findMany({
      where:   activeOnly ? { isActive: true } : {},
      orderBy: { name: 'asc' },
      select:  COMPANY_SELECT,
    });
  },

  getById: async (id: number) => {
    const company = await prisma.company.findUnique({ where: { id }, select: COMPANY_SELECT });
    if (!company) throw new Error('COMPANY_NOT_FOUND');
    return company;
  },
};
