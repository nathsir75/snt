import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { isSuperAdmin } from '../../common/utils/scope.util';
import { Prisma } from '@prisma/client';

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_MEDIA_TYPES    = ['image', 'pdf', 'ppt', 'video', 'document'] as const;
const VALID_PROVIDER_TYPES = ['local', 'external', 'youtube', 'vimeo', 'r2'] as const;
const VALID_OWNER_SCOPES   = ['global', 'branch'] as const;

type MediaType    = (typeof VALID_MEDIA_TYPES)[number];
type ProviderType = (typeof VALID_PROVIDER_TYPES)[number];
type OwnerScope   = (typeof VALID_OWNER_SCOPES)[number];

// ─── Select ───────────────────────────────────────────────────────────────────

const ASSET_SELECT = {
  id:              true,
  title:           true,
  description:     true,
  mediaType:       true,
  providerType:    true,
  fileUrl:         true,
  thumbnailUrl:    true,
  mimeType:        true,
  fileSizeKb:      true,
  ownerScope:      true,
  branchId:        true,
  tagsJson:        true,
  isActive:        true,
  createdAt:       true,
  updatedAt:       true,
  branch:          { select: { id: true, name: true, code: true } },
  createdBy:       { select: { id: true, name: true } },
};

const PUBLIC_ASSET_SELECT = {
  id:           true,
  title:        true,
  fileUrl:      true,
  thumbnailUrl: true,
};

// ─── Access guard ─────────────────────────────────────────────────────────────

function assertAssetAccess(user: AuthPayload, asset: { ownerScope: string; branchId: number | null }): void {
  if (isSuperAdmin(user.role)) return;
  // branch_admin can access global assets or own branch assets
  const accessible =
    asset.ownerScope === 'global' ||
    (asset.ownerScope === 'branch' && asset.branchId === user.branchId);
  if (!accessible) {
    console.warn(`[MediaLibrary] Branch access denied — userId branchId=${user.branchId}, asset branchId=${asset.branchId}`);
    throw new Error('ACCESS_DENIED');
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const mediaLibraryService = {

  // ─── 1. Create media asset ──────────────────────────────────────────────────
  create: async (
    user: AuthPayload,
    data: {
      title:          string;
      description?:   string;
      mediaType:      string;
      providerType:   string;
      fileUrl:        string;
      thumbnailUrl?:  string;
      mimeType?:      string;
      fileSizeKb?:    number;
      ownerScope:     string;
      branchId?:      number;
      tagsJson?:      unknown;
    },
  ) => {
    if (!VALID_MEDIA_TYPES.includes(data.mediaType as MediaType)) {
      throw new Error('INVALID_MEDIA_TYPE');
    }
    if (!VALID_PROVIDER_TYPES.includes(data.providerType as ProviderType)) {
      throw new Error('INVALID_PROVIDER_TYPE');
    }
    if (!VALID_OWNER_SCOPES.includes(data.ownerScope as OwnerScope)) {
      throw new Error('INVALID_OWNER_SCOPE');
    }

    // Scope rules
    if (data.ownerScope === 'global') {
      if (!isSuperAdmin(user.role)) throw new Error('GLOBAL_ASSET_FORBIDDEN');
      if (data.branchId != null) throw new Error('INVALID_SCOPE_MAPPING');
    }

    if (data.ownerScope === 'branch') {
      const branchId = isSuperAdmin(user.role) ? data.branchId : user.branchId;
      if (!branchId) throw new Error('BRANCH_REQUIRED_FOR_SCOPE');
      // branch_admin cannot create for another branch
      if (!isSuperAdmin(user.role) && data.branchId && data.branchId !== user.branchId) {
        throw new Error('ACCESS_DENIED');
      }
      data.branchId = branchId;

      const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
      if (!branch) throw new Error('BRANCH_NOT_FOUND');
    }

    const asset = await prisma.mediaAsset.create({
      data: {
        title:           data.title,
        description:     data.description     ?? null,
        mediaType:       data.mediaType,
        providerType:    data.providerType,
        fileUrl:         data.fileUrl,
        thumbnailUrl:    data.thumbnailUrl    ?? null,
        mimeType:        data.mimeType        ?? null,
        fileSizeKb:      data.fileSizeKb      ?? null,
        ownerScope:      data.ownerScope,
        branchId:        data.branchId        ?? null,
        tagsJson:        (data.tagsJson as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        createdByUserId: user.userId,
      },
      select: ASSET_SELECT,
    });

    console.log(`[MediaLibrary] Asset created — id=${asset.id}, scope=${data.ownerScope}, type=${data.mediaType}`);
    return asset;
  },

  // ─── 2. List media assets ───────────────────────────────────────────────────
  list: async (
    user: AuthPayload,
    filters: {
      mediaType?:    string;
      providerType?: string;
      ownerScope?:   string;
      branchId?:     number;
      isActive?:     boolean;
      search?:       string;
    },
  ) => {
    const where: Prisma.MediaAssetWhereInput = {};

    if (isSuperAdmin(user.role)) {
      // super_admin: optional filters
      if (filters.branchId)    where.branchId   = filters.branchId;
      if (filters.ownerScope)  where.ownerScope = filters.ownerScope;
    } else {
      // branch_admin: global active assets OR own branch assets
      where.OR = [
        { ownerScope: 'global', isActive: true },
        { ownerScope: 'branch', branchId: user.branchId as number },
      ];
    }

    if (filters.mediaType)    where.mediaType    = filters.mediaType;
    if (filters.providerType) where.providerType = filters.providerType;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    if (filters.search) {
      where.title = { contains: filters.search, mode: 'insensitive' };
    }

    const assets = await prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select:  ASSET_SELECT,
    });

    console.log(`[MediaLibrary] Assets listed — role=${user.role}, count=${assets.length}`);
    return assets;
  },

  // ─── 3. Get by id ───────────────────────────────────────────────────────────
  getById: async (id: number, user: AuthPayload) => {
    const asset = await prisma.mediaAsset.findUnique({ where: { id }, select: ASSET_SELECT });
    if (!asset) throw new Error('ASSET_NOT_FOUND');

    assertAssetAccess(user, asset);

    console.log(`[MediaLibrary] Asset fetched — id=${id}`);
    return asset;
  },

  // ─── 4. Update media asset ──────────────────────────────────────────────────
  update: async (
    id: number,
    user: AuthPayload,
    data: Partial<{
      title:        string;
      description:  string;
      thumbnailUrl: string;
      mimeType:     string;
      fileSizeKb:   number;
      tagsJson:     unknown;
      isActive:     boolean;
      // fileUrl update: allowed for super_admin only
      fileUrl:      string;
    }>,
  ) => {
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new Error('ASSET_NOT_FOUND');

    assertAssetAccess(user, asset);

    // branch_admin cannot update global assets (read-only for them)
    if (!isSuperAdmin(user.role) && asset.ownerScope === 'global') {
      throw new Error('ACCESS_DENIED');
    }

    // fileUrl update restricted to super_admin
    if (data.fileUrl !== undefined && !isSuperAdmin(user.role)) {
      throw new Error('FILE_URL_UPDATE_FORBIDDEN');
    }

    const updateData: Prisma.MediaAssetUpdateInput = {};
    if (data.title        !== undefined) updateData.title        = data.title;
    if (data.description  !== undefined) updateData.description  = data.description;
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;
    if (data.mimeType     !== undefined) updateData.mimeType     = data.mimeType;
    if (data.fileSizeKb   !== undefined) updateData.fileSizeKb   = data.fileSizeKb;
    if (data.isActive     !== undefined) updateData.isActive     = data.isActive;
    if (data.fileUrl      !== undefined) updateData.fileUrl      = data.fileUrl;
    if (data.tagsJson     !== undefined) {
      updateData.tagsJson = data.tagsJson as Prisma.InputJsonValue;
    }

    const updated = await prisma.mediaAsset.update({
      where:  { id },
      data:   updateData,
      select: ASSET_SELECT,
    });

    console.log(`[MediaLibrary] Asset updated — id=${id}`);
    return updated;
  },

  // ─── 5. Soft deactivate ─────────────────────────────────────────────────────
  deactivate: async (id: number, user: AuthPayload) => {
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new Error('ASSET_NOT_FOUND');

    assertAssetAccess(user, asset);

    if (!isSuperAdmin(user.role) && asset.ownerScope === 'global') {
      throw new Error('ACCESS_DENIED');
    }

    const updated = await prisma.mediaAsset.update({
      where:  { id },
      data:   { isActive: false },
      select: ASSET_SELECT,
    });

    console.log(`[MediaLibrary] Asset deactivated — id=${id}`);
    return updated;
  },

  // ─── 6. Public branch images (no auth) ──────────────────────────────────────
  getPublicBranchImages: async (branchId: number, includeGlobal: boolean) => {
    const where: Prisma.MediaAssetWhereInput = {
      mediaType: 'image',
      isActive:  true,
      OR: includeGlobal
        ? [{ ownerScope: 'branch', branchId }, { ownerScope: 'global' }]
        : [{ ownerScope: 'branch', branchId }],
    };

    const assets = await prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select:  PUBLIC_ASSET_SELECT,
    });

    console.log(`[MediaLibrary] Public branch images fetched — branchId=${branchId}, count=${assets.length}`);
    return assets;
  },

  // ─── 7. LMS/Page Builder integration helpers ────────────────────────────────
  getGlobalAssetsByType: async (mediaType: string) => {
    return prisma.mediaAsset.findMany({
      where:   { ownerScope: 'global', mediaType, isActive: true },
      orderBy: { createdAt: 'desc' },
      select:  ASSET_SELECT,
    });
  },

  getAccessibleAssetsForBranch: async (branchId: number, mediaType?: string) => {
    const where: Prisma.MediaAssetWhereInput = {
      isActive: true,
      OR: [
        { ownerScope: 'global' },
        { ownerScope: 'branch', branchId },
      ],
    };
    if (mediaType) where.mediaType = mediaType;

    return prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select:  ASSET_SELECT,
    });
  },
};
