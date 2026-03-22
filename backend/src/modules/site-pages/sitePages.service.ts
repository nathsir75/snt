import prisma from '../../db/prisma';

const PAGE_SELECT = {
  id: true, title: true, slug: true, pageType: true,
  isPublished: true, seoJson: true, createdAt: true, updatedAt: true,
  sections: {
    where: { isVisible: true },
    orderBy: { order: 'asc' as const },
    select: { id: true, sectionType: true, title: true, order: true, configJson: true, isVisible: true },
  },
};

export const sitePagesService = {
  list: async () =>
    prisma.sitePage.findMany({ orderBy: { updatedAt: 'desc' }, select: PAGE_SELECT }),

  getBySlug: async (slug: string, preview = false) => {
    const page = await prisma.sitePage.findUnique({ where: { slug }, select: PAGE_SELECT });
    if (!page) return { status: 'not_found' as const };
    if (!page.isPublished && !preview) return { status: 'unpublished' as const };
    return { status: 'ok' as const, page };
  },

  getById: async (id: number) =>
    prisma.sitePage.findUnique({ where: { id }, select: PAGE_SELECT }),

  create: async (data: { title: string; slug: string; pageType?: string; seoJson?: object }) =>
    prisma.sitePage.create({ data: { ...data, seoJson: data.seoJson ?? {} }, select: PAGE_SELECT }),

  update: async (id: number, data: Partial<{ title: string; slug: string; pageType: string; isPublished: boolean; seoJson: object }>) =>
    prisma.sitePage.update({ where: { id }, data, select: PAGE_SELECT }),

  delete: async (id: number) => prisma.sitePage.delete({ where: { id } }),

  // Sections
  addSection: async (pageId: number, data: { sectionType: string; title?: string; order: number; configJson: object }) => {
    // shift existing sections at same order up
    await prisma.siteSection.updateMany({
      where: { pageId, order: { gte: data.order } },
      data: { order: { increment: 1 } },
    });
    return prisma.siteSection.create({ data: { pageId, ...data } });
  },

  updateSection: async (sectionId: number, data: Partial<{ title: string; order: number; configJson: object; isVisible: boolean }>) =>
    prisma.siteSection.update({ where: { id: sectionId }, data }),

  deleteSection: async (sectionId: number) => prisma.siteSection.delete({ where: { id: sectionId } }),

  reorderSections: async (pageId: number, orderedIds: number[]) => {
    await Promise.all(
      orderedIds.map((id, idx) => prisma.siteSection.update({ where: { id }, data: { order: idx + 1 } }))
    );
    return prisma.sitePage.findUnique({ where: { id: pageId }, select: PAGE_SELECT });
  },
};
