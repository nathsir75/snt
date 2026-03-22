import prisma from '../../db/prisma';

const VALID_TYPES = [
  'course', 'placement', 'career', 'internship', 'corporate',
  'college', 'testimonial', 'faq', 'announcement', 'branch_location',
] as const;

export type SiteCollectionType = typeof VALID_TYPES[number];

export const siteCollectionsService = {
  list: async (type?: string) =>
    prisma.siteCollection.findMany({
      where: type ? { collectionType: type } : undefined,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    }),

  listPublic: async (type: string) =>
    prisma.siteCollection.findMany({
      where: { collectionType: type, isPublished: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    }),

  getById: async (id: number) => prisma.siteCollection.findUnique({ where: { id } }),

  create: async (data: {
    collectionType: string; title: string; slug: string;
    summary?: string; content?: string; imageUrl?: string;
    metaJson?: object; isPublished?: boolean; isFeatured?: boolean; displayOrder?: number;
  }) => prisma.siteCollection.create({ data: { ...data, metaJson: data.metaJson ?? {} } }),

  update: async (id: number, data: Partial<{
    title: string; slug: string; summary: string; content: string;
    imageUrl: string; metaJson: object; isPublished: boolean; isFeatured: boolean; displayOrder: number;
  }>) => prisma.siteCollection.update({ where: { id }, data }),

  delete: async (id: number) => prisma.siteCollection.delete({ where: { id } }),

  togglePublish: async (id: number) => {
    const item = await prisma.siteCollection.findUnique({ where: { id } });
    if (!item) throw new Error('NOT_FOUND');
    return prisma.siteCollection.update({
      where: { id },
      data: { isPublished: !item.isPublished, publishedAt: !item.isPublished ? new Date() : null },
    });
  },
};
