import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { isSuperAdmin } from '../../common/utils/scope.util';
import { Prisma } from '@prisma/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CollectionType = 'project' | 'activity' | 'news' | 'gallery' | 'award' | 'client';

export interface CollectionItem {
  id: number;
  branchId: number;
  collectionType: CollectionType;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  imageUrl: string | null;
  metaJson: Record<string, unknown>;
  isPublished: boolean;
  displayOrder: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Branch access guard ───────────────────────────────────────────────────────

function assertBranchAccess(user: AuthPayload, branchId: number): void {
  if (!isSuperAdmin(user.role) && branchId !== user.branchId) {
    throw new Error('ACCESS_DENIED');
  }
}

function resolveBranchId(user: AuthPayload, bodyBranchId?: number): number {
  if (isSuperAdmin(user.role)) {
    if (!bodyBranchId) throw new Error('BRANCH_REQUIRED');
    return bodyBranchId;
  }
  if (!user.branchId) throw new Error('NO_BRANCH');
  return user.branchId;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const branchContentService = {

  list: async (user: AuthPayload, collectionType?: CollectionType) => {
    const branchId = isSuperAdmin(user.role) ? undefined : (user.branchId as number);
    const where: Prisma.BranchContentItemWhereInput = {
      ...(branchId !== undefined && { branchId }),
      ...(collectionType && { collectionType }),
    };
    return prisma.branchContentItem.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
  },

  getById: async (id: number, user: AuthPayload) => {
    const item = await prisma.branchContentItem.findUnique({ where: { id } });
    if (!item) throw new Error('ITEM_NOT_FOUND');
    assertBranchAccess(user, item.branchId);
    return item;
  },

  create: async (
    user: AuthPayload,
    data: {
      collectionType: CollectionType;
      title: string;
      slug?: string;
      summary?: string;
      content?: string;
      imageUrl?: string;
      metaJson?: Record<string, unknown>;
      displayOrder?: number;
      branchId?: number;
    },
  ) => {
    const branchId = resolveBranchId(user, data.branchId);
    const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Ensure slug uniqueness per branch+type
    const existing = await prisma.branchContentItem.findFirst({
      where: { branchId, collectionType: data.collectionType, slug },
    });
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    const maxOrder = await prisma.branchContentItem.aggregate({
      where: { branchId, collectionType: data.collectionType },
      _max: { displayOrder: true },
    });

    const item = await prisma.branchContentItem.create({
      data: {
        branchId,
        collectionType: data.collectionType,
        title:        data.title,
        slug:         finalSlug,
        summary:      data.summary      ?? null,
        content:      data.content      ?? null,
        imageUrl:     data.imageUrl     ?? null,
        metaJson:     (data.metaJson ?? {}) as Prisma.InputJsonValue,
        displayOrder: data.displayOrder ?? ((maxOrder._max.displayOrder ?? 0) + 1),
        isPublished:  false,
      },
    });

    console.log(`[BranchContent] Created ${data.collectionType} id=${item.id} branchId=${branchId}`);
    return item;
  },

  update: async (
    id: number,
    user: AuthPayload,
    data: Partial<{
      title: string;
      slug: string;
      summary: string;
      content: string;
      imageUrl: string;
      metaJson: Record<string, unknown>;
      displayOrder: number;
      isPublished: boolean;
    }>,
  ) => {
    const item = await prisma.branchContentItem.findUnique({ where: { id } });
    if (!item) throw new Error('ITEM_NOT_FOUND');
    assertBranchAccess(user, item.branchId);

    const updateData: Prisma.BranchContentItemUpdateInput = {
      ...(data.title        !== undefined && { title:        data.title }),
      ...(data.slug         !== undefined && { slug:         data.slug }),
      ...(data.summary      !== undefined && { summary:      data.summary }),
      ...(data.content      !== undefined && { content:      data.content }),
      ...(data.imageUrl     !== undefined && { imageUrl:     data.imageUrl }),
      ...(data.metaJson     !== undefined && { metaJson:     data.metaJson as Prisma.InputJsonValue }),
      ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
      ...(data.isPublished  !== undefined && {
        isPublished: data.isPublished,
        publishedAt: data.isPublished ? new Date() : null,
      }),
    };

    const updated = await prisma.branchContentItem.update({ where: { id }, data: updateData });
    console.log(`[BranchContent] Updated id=${id} isPublished=${updated.isPublished}`);
    return updated;
  },

  delete: async (id: number, user: AuthPayload) => {
    const item = await prisma.branchContentItem.findUnique({ where: { id } });
    if (!item) throw new Error('ITEM_NOT_FOUND');
    assertBranchAccess(user, item.branchId);
    await prisma.branchContentItem.delete({ where: { id } });
    console.log(`[BranchContent] Deleted id=${id}`);
    return { deleted: true, id };
  },

  // Public: list published items for a branch by type
  listPublic: async (branchCode: string, collectionType: CollectionType) => {
    const branch = await prisma.branch.findUnique({
      where: { code: branchCode.toLowerCase() },
      select: { id: true, status: true },
    });
    if (!branch || branch.status !== 'active') throw new Error('BRANCH_NOT_FOUND');

    return prisma.branchContentItem.findMany({
      where: { branchId: branch.id, collectionType, isPublished: true },
      orderBy: [{ displayOrder: 'asc' }, { publishedAt: 'desc' }],
    });
  },
};
