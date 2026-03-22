import prisma from '../../db/prisma';

export const siteEnquiriesService = {
  submit: async (data: {
    enquiryType: string; fullName: string; phone: string;
    email?: string; subject?: string; message?: string; metaJson?: object;
  }) => prisma.siteEnquiry.create({ data: { ...data, metaJson: data.metaJson ?? {} } }),

  list: async (type?: string, status?: string) =>
    prisma.siteEnquiry.findMany({
      where: {
        ...(type ? { enquiryType: type } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    }),

  getById: async (id: number) => prisma.siteEnquiry.findUnique({ where: { id } }),

  update: async (id: number, data: { status?: string; notes?: string }) =>
    prisma.siteEnquiry.update({ where: { id }, data }),
};
