import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { isSuperAdmin } from '../../common/utils/scope.util';
import { Prisma } from '@prisma/client';

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_PAGE_TYPES    = ['home', 'about', 'courses', 'gallery', 'contact', 'projects', 'activities', 'news', 'awards', 'clients', 'custom'] as const;
const VALID_SECTION_TYPES = ['hero', 'text', 'gallery', 'cta', 'testimonials', 'stats', 'courses', 'contact', 'banner', 'features', 'collection'] as const;

type PageType    = (typeof VALID_PAGE_TYPES)[number];
type SectionType = (typeof VALID_SECTION_TYPES)[number];

// ─── Selects ─────────────────────────────────────────────────────────────────

const SECTION_SELECT = {
  id:          true,
  sectionType: true,
  title:       true,
  order:       true,
  configJson:  true,
  isVisible:   true,
  createdAt:   true,
  updatedAt:   true,
};

const PAGE_SELECT = {
  id:          true,
  branchId:    true,
  title:       true,
  slug:        true,
  pageType:    true,
  isPublished: true,
  createdAt:   true,
  updatedAt:   true,
  branch:      { select: { id: true, name: true, code: true } },
};

// ─── Branch access guard ──────────────────────────────────────────────────────

function assertPageAccess(user: AuthPayload, pageBranchId: number): void {
  if (!isSuperAdmin(user.role) && pageBranchId !== user.branchId) {
    console.warn(`[PageService] Branch access denied — user branchId=${user.branchId}, page branchId=${pageBranchId}`);
    throw new Error('ACCESS_DENIED');
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const pageService = {

  // ─── 1. Create page ─────────────────────────────────────────────────────────
  createPage: async (
    user: AuthPayload,
    data: { branchId: number; title: string; slug: string; pageType?: string },
  ) => {
    // branch_admin can only create for own branch
    if (!isSuperAdmin(user.role) && data.branchId !== user.branchId) {
      throw new Error('ACCESS_DENIED');
    }

    if (data.pageType && !VALID_PAGE_TYPES.includes(data.pageType as PageType)) {
      throw new Error('INVALID_PAGE_TYPE');
    }

    const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
    if (!branch) throw new Error('BRANCH_NOT_FOUND');

    // Check slug uniqueness per branch
    const slugExists = await prisma.page.findUnique({
      where: { branchId_slug: { branchId: data.branchId, slug: data.slug } },
    });
    if (slugExists) throw new Error('DUPLICATE_SLUG');

    const page = await prisma.page.create({
      data: {
        branchId: data.branchId,
        title:    data.title,
        slug:     data.slug,
        pageType: (data.pageType ?? 'custom'),
      },
      select: PAGE_SELECT,
    });

    console.log(`[PageService] Page created — id=${page.id}, branchId=${data.branchId}, slug=${data.slug}`);
    return page;
  },

  // ─── 2. List pages ──────────────────────────────────────────────────────────
  listPages: async (user: AuthPayload, filterBranchId?: number) => {
    const where: Prisma.PageWhereInput = {};

    if (isSuperAdmin(user.role)) {
      if (filterBranchId) where.branchId = filterBranchId;
    } else {
      where.branchId = user.branchId as number;
    }

    const pages = await prisma.page.findMany({
      where,
      orderBy: [{ branchId: 'asc' }, { createdAt: 'desc' }],
      select:  PAGE_SELECT,
    });

    console.log(`[PageService] Pages listed — role=${user.role}, count=${pages.length}`);
    return pages;
  },

  // ─── 3. Get page by id (with sections) ──────────────────────────────────────
  getPageById: async (id: number, user: AuthPayload) => {
    const page = await prisma.page.findUnique({
      where:  { id },
      select: {
        ...PAGE_SELECT,
        sections: {
          orderBy: { order: 'asc' },
          select:  SECTION_SELECT,
        },
      },
    });
    if (!page) throw new Error('PAGE_NOT_FOUND');

    assertPageAccess(user, page.branchId);

    console.log(`[PageService] Page fetched — id=${id}, branchId=${page.branchId}`);
    return page;
  },

  // ─── 4. Update page ─────────────────────────────────────────────────────────
  updatePage: async (
    id: number,
    user: AuthPayload,
    data: Partial<{ title: string; slug: string; pageType: string; isPublished: boolean }>,
  ) => {
    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) throw new Error('PAGE_NOT_FOUND');

    assertPageAccess(user, page.branchId);

    if (data.pageType && !VALID_PAGE_TYPES.includes(data.pageType as PageType)) {
      throw new Error('INVALID_PAGE_TYPE');
    }

    // If slug is changing, check uniqueness
    if (data.slug && data.slug !== page.slug) {
      const slugExists = await prisma.page.findUnique({
        where: { branchId_slug: { branchId: page.branchId, slug: data.slug } },
      });
      if (slugExists) throw new Error('DUPLICATE_SLUG');
    }

    const updated = await prisma.page.update({
      where:  { id },
      data,
      select: PAGE_SELECT,
    });

    console.log(`[PageService] Page updated — id=${id}, isPublished=${updated.isPublished}`);
    return updated;
  },

  // ─── 5. Add page section ────────────────────────────────────────────────────
  addSection: async (
    pageId: number,
    user: AuthPayload,
    data: {
      sectionType: string;
      title?:      string;
      order:       number;
      configJson:  Record<string, unknown>;
      isVisible?:  boolean;
    },
  ) => {
    const page = await prisma.page.findUnique({ where: { id: pageId } });
    if (!page) throw new Error('PAGE_NOT_FOUND');

    assertPageAccess(user, page.branchId);

    if (!VALID_SECTION_TYPES.includes(data.sectionType as SectionType)) {
      throw new Error('INVALID_SECTION_TYPE');
    }

    // Check order uniqueness per page
    const orderExists = await prisma.pageSection.findUnique({
      where: { pageId_order: { pageId, order: data.order } },
    });
    if (orderExists) throw new Error('SECTION_ORDER_CONFLICT');

    const section = await prisma.pageSection.create({
      data: {
        pageId,
        sectionType: data.sectionType,
        title:       data.title      ?? null,
        order:       data.order,
        configJson:  data.configJson as Prisma.InputJsonValue,
        isVisible:   data.isVisible  ?? true,
      },
      select: SECTION_SELECT,
    });

    console.log(`[PageService] Section added — id=${section.id}, pageId=${pageId}, type=${data.sectionType}, order=${data.order}`);
    return section;
  },

  // ─── 6. Update page section ─────────────────────────────────────────────────
  updateSection: async (
    id: number,
    user: AuthPayload,
    data: Partial<{ title: string; order: number; configJson: Record<string, unknown>; isVisible: boolean }>,
  ) => {
    const section = await prisma.pageSection.findUnique({
      where:   { id },
      include: { page: { select: { branchId: true } } },
    });
    if (!section) throw new Error('SECTION_NOT_FOUND');

    assertPageAccess(user, section.page.branchId);

    // If order is changing, check uniqueness
    if (data.order !== undefined && data.order !== section.order) {
      const orderExists = await prisma.pageSection.findUnique({
        where: { pageId_order: { pageId: section.pageId, order: data.order } },
      });
      if (orderExists) throw new Error('SECTION_ORDER_CONFLICT');
    }

    const updateData: Prisma.PageSectionUpdateInput = {};
    if (data.title     !== undefined) updateData.title     = data.title;
    if (data.order     !== undefined) updateData.order     = data.order;
    if (data.isVisible !== undefined) updateData.isVisible = data.isVisible;
    if (data.configJson !== undefined) updateData.configJson = data.configJson as Prisma.InputJsonValue;

    const updated = await prisma.pageSection.update({
      where:  { id },
      data:   updateData,
      select: SECTION_SELECT,
    });

    console.log(`[PageService] Section updated — id=${id}`);
    return updated;
  },

  // ─── 7. Delete page section ─────────────────────────────────────────────────
  deleteSection: async (id: number, user: AuthPayload) => {
    const section = await prisma.pageSection.findUnique({
      where:   { id },
      include: { page: { select: { branchId: true } } },
    });
    if (!section) throw new Error('SECTION_NOT_FOUND');

    assertPageAccess(user, section.page.branchId);

    await prisma.pageSection.delete({ where: { id } });
    console.log(`[PageService] Section deleted — id=${id}`);
    return { deleted: true, id };
  },

  // ─── 8. Public page fetch (no auth) ─────────────────────────────────────────
  getPublicPage: async (branchId: number, slug: string) => {
    const page = await prisma.page.findUnique({
      where: { branchId_slug: { branchId, slug } },
      select: {
        id:          true,
        title:       true,
        slug:        true,
        pageType:    true,
        isPublished: true,
        branch:      { select: { id: true, name: true, city: true } },
        sections: {
          where:   { isVisible: true },
          orderBy: { order: 'asc' },
          select:  SECTION_SELECT,
        },
      },
    });

    if (!page || !page.isPublished) throw new Error('PAGE_NOT_FOUND');

    console.log(`[PageService] Public page fetched — branchId=${branchId}, slug=${slug}`);
    return page;
  },

  // ─── 9. Public homepage shortcut ────────────────────────────────────────────
  getPublicHome: async (branchId: number) => {
    // Try slug='home' first, then fall back to pageType='home'
    const page = await prisma.page.findFirst({
      where: {
        branchId,
        isPublished: true,
        OR: [{ slug: 'home' }, { pageType: 'home' }],
      },
      select: {
        id:          true,
        title:       true,
        slug:        true,
        pageType:    true,
        isPublished: true,
        branch:      { select: { id: true, name: true, city: true } },
        sections: {
          where:   { isVisible: true },
          orderBy: { order: 'asc' },
          select:  SECTION_SELECT,
        },
      },
    });

    if (!page) throw new Error('PAGE_NOT_FOUND');

    console.log(`[PageService] Public home page fetched — branchId=${branchId}`);
    return page;
  },

  // ─── 10. Resolve branch by code (public) ────────────────────────────────────
  resolveBranchByCode: async (branchCode: string) => {
    const branch = await prisma.branch.findUnique({
      where:  { code: branchCode.toLowerCase() },
      select: { id: true, name: true, code: true, city: true, status: true },
    });
    if (!branch || branch.status !== 'active') throw new Error('BRANCH_NOT_FOUND');
    console.log(`[PageService] Branch resolved — code=${branchCode}, id=${branch.id}`);
    return branch;
  },

  // ─── 11. Public page by branchCode + slug ───────────────────────────────────
  //
  // Returns one of four structured outcomes (never throws for expected cases):
  //   { status: 'ok',           page }          — published page found
  //   { status: 'no_content' }                  — branch exists, no published pages at all
  //   { status: 'not_found' }                   — slug given but not found / unpublished
  //   { status: 'branch_not_found' }            — branchCode invalid or inactive
  //
  getPublicPageByCode: async (branchCode: string, slug: string) => {
    const PAGE_SELECT_FULL = {
      id: true, title: true, slug: true, pageType: true, isPublished: true,
      branch: { select: { id: true, name: true, city: true, code: true } },
      sections: { where: { isVisible: true }, orderBy: { order: 'asc' as const }, select: SECTION_SELECT },
    };

    const branch = await prisma.branch.findUnique({
      where:  { code: branchCode.toLowerCase() },
      select: { id: true, name: true, code: true, city: true, status: true },
    });
    if (!branch || branch.status !== 'active') {
      console.log(`[PageService] Branch not found — code=${branchCode}`);
      return { status: 'branch_not_found' as const, page: null, branch: null };
    }

    const isHome = slug === '' || slug === 'home';

    if (isHome) {
      // Priority 1: slug='home'
      let page = await prisma.page.findFirst({
        where: { branchId: branch.id, isPublished: true, slug: 'home' },
        select: PAGE_SELECT_FULL,
      });
      // Priority 2: pageType='home'
      if (!page) {
        page = await prisma.page.findFirst({
          where: { branchId: branch.id, isPublished: true, pageType: 'home' },
          select: PAGE_SELECT_FULL,
        });
      }
      // Priority 3: any first published page
      if (!page) {
        page = await prisma.page.findFirst({
          where:   { branchId: branch.id, isPublished: true },
          orderBy: { createdAt: 'asc' },
          select:  PAGE_SELECT_FULL,
        });
      }
      // Priority 4: no published content at all
      if (!page) {
        console.log(`[PageService] No published pages — code=${branchCode}`);
        return { status: 'no_content' as const, page: null, branch };
      }
      console.log(`[PageService] Public home by code — code=${branchCode}, slug=${page.slug}`);
      return { status: 'ok' as const, page, branch };
    }

    // Specific slug requested
    const page = await prisma.page.findUnique({
      where:  { branchId_slug: { branchId: branch.id, slug } },
      select: PAGE_SELECT_FULL,
    });

    if (!page) {
      console.log(`[PageService] Page not found — code=${branchCode}, slug=${slug}`);
      return { status: 'not_found' as const, page: null, branch };
    }
    if (!page.isPublished) {
      console.log(`[PageService] Page unpublished — code=${branchCode}, slug=${slug}`);
      return { status: 'not_found' as const, page: null, branch };
    }

    console.log(`[PageService] Public page by code — code=${branchCode}, slug=${slug}`);
    return { status: 'ok' as const, page, branch };
  },
};
