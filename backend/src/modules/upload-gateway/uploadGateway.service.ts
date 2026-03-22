import path from 'path';
import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { isSuperAdmin } from '../../common/utils/scope.util';
import { Prisma } from '@prisma/client';
import {
  UPLOAD_CATEGORIES,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIMES,
  CATEGORY_TO_MEDIA_TYPE,
  UploadCategory,
} from '../../common/constants/upload.constants';
import {
  buildStorageDir,
  buildSafeFilename,
  buildFileUrl,
  ensureDir,
  deleteFileFromDisk,
  resolveAbsoluteFromUrl,
  assertNoPathTraversal,
} from '../../common/utils/file.util';
import { promises as fsp } from 'fs';

// ─── Shared MediaAsset select ─────────────────────────────────────────────────

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

// ─── Scope + ownership validation ────────────────────────────────────────────

function validateUploadScope(
  user: AuthPayload,
  ownerScope: string,
  branchId: number | undefined,
): { resolvedBranchId: number | null } {
  if (ownerScope !== 'global' && ownerScope !== 'branch') {
    throw new Error('INVALID_OWNER_SCOPE');
  }

  if (ownerScope === 'global') {
    if (!isSuperAdmin(user.role)) throw new Error('GLOBAL_UPLOAD_FORBIDDEN');
    return { resolvedBranchId: null };
  }

  // ownerScope === 'branch'
  const resolvedBranchId = isSuperAdmin(user.role) ? (branchId ?? null) : user.branchId;
  if (!resolvedBranchId) throw new Error('BRANCH_REQUIRED_FOR_SCOPE');
  if (!isSuperAdmin(user.role) && branchId && branchId !== user.branchId) {
    throw new Error('ACCESS_DENIED');
  }
  return { resolvedBranchId };
}

// ─── File type validation ─────────────────────────────────────────────────────

export function validateFileType(
  originalName: string,
  mimeType: string,
  uploadCategory: string,
): UploadCategory {
  if (!UPLOAD_CATEGORIES.includes(uploadCategory as UploadCategory)) {
    throw new Error('INVALID_UPLOAD_CATEGORY');
  }
  const category = uploadCategory as UploadCategory;
  const ext      = path.extname(originalName).toLowerCase();

  if (!ALLOWED_EXTENSIONS[category].includes(ext)) {
    throw new Error('UNSUPPORTED_FILE_EXTENSION');
  }
  if (!ALLOWED_MIMES[category].includes(mimeType)) {
    throw new Error('UNSUPPORTED_MIME_TYPE');
  }
  return category;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const uploadGatewayService = {

  // ─── 1. Upload file + register MediaAsset ───────────────────────────────────
  uploadFile: async (
    user: AuthPayload,
    file: Express.Multer.File,
    fields: {
      title?:          string;
      description?:    string;
      uploadCategory:  string;
      ownerScope:      string;
      branchId?:       number;
      tagsJson?:       string; // stringified JSON array from form
    },
  ) => {
    console.log(`[UploadGateway] Upload started — user=${user.userId}, category=${fields.uploadCategory}, scope=${fields.ownerScope}`);

    // 1. Validate scope
    const { resolvedBranchId } = validateUploadScope(user, fields.ownerScope, fields.branchId);

    // 2. Validate file type
    const category = validateFileType(file.originalname, file.mimetype, fields.uploadCategory);

    // 3. Validate branch exists if branch-scoped
    if (resolvedBranchId) {
      const branch = await prisma.branch.findUnique({ where: { id: resolvedBranchId } });
      if (!branch) throw new Error('BRANCH_NOT_FOUND');
    }

    // 4. Build destination directory and safe filename
    const storageDir = buildStorageDir(
      fields.ownerScope as 'global' | 'branch',
      category,
      resolvedBranchId ?? undefined,
    );
    await ensureDir(storageDir);

    const safeFilename = buildSafeFilename(file.originalname);
    const destPath     = path.join(storageDir, safeFilename);

    // 5. Path traversal guard
    assertNoPathTraversal(destPath);

    // 6. Write file to disk (multer memoryStorage gives us buffer)
    await fsp.writeFile(destPath, file.buffer);
    console.log(`[UploadGateway] File stored — ${destPath}`);

    // 7. Build serving URL
    const fileUrl    = buildFileUrl(destPath);
    const fileSizeKb = Math.ceil(file.size / 1024);

    // 8. Parse tagsJson safely
    let parsedTags: unknown = Prisma.JsonNull;
    if (fields.tagsJson) {
      try {
        parsedTags = JSON.parse(fields.tagsJson);
      } catch {
        console.warn('[UploadGateway] tagsJson parse failed — ignoring tags');
      }
    }

    // 9. Register in MediaAsset
    const mediaType = CATEGORY_TO_MEDIA_TYPE[category];
    const asset = await prisma.mediaAsset.create({
      data: {
        title:           fields.title ?? file.originalname,
        description:     fields.description ?? null,
        mediaType,
        providerType:    'local',
        fileUrl,
        thumbnailUrl:    null,
        mimeType:        file.mimetype,
        fileSizeKb,
        ownerScope:      fields.ownerScope,
        branchId:        resolvedBranchId,
        tagsJson:        parsedTags as Prisma.InputJsonValue,
        isActive:        true,
        createdByUserId: user.userId,
      },
      select: ASSET_SELECT,
    });

    console.log(`[UploadGateway] MediaAsset created — id=${asset.id}, url=${fileUrl}`);
    return { asset, fileUrl, storedPath: destPath };
  },

  // ─── 2. List my uploaded files ──────────────────────────────────────────────
  listMyFiles: async (
    user: AuthPayload,
    filters: { mediaType?: string; ownerScope?: string; search?: string },
  ) => {
    const where: Prisma.MediaAssetWhereInput = { providerType: 'local' };

    if (isSuperAdmin(user.role)) {
      // super_admin: own uploads by default; can see all local assets
      where.createdByUserId = user.userId;
    } else {
      // branch_admin: own branch local assets only
      where.OR = [
        { ownerScope: 'branch', branchId: user.branchId as number },
      ];
    }

    if (filters.mediaType)   where.mediaType   = filters.mediaType;
    if (filters.ownerScope)  where.ownerScope  = filters.ownerScope;
    if (filters.search)      where.title       = { contains: filters.search, mode: 'insensitive' };

    const assets = await prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select:  ASSET_SELECT,
    });

    console.log(`[UploadGateway] My files listed — userId=${user.userId}, count=${assets.length}`);
    return assets;
  },

  // ─── 3. Delete uploaded file ─────────────────────────────────────────────────
  deleteFile: async (mediaAssetId: number, user: AuthPayload) => {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } });
    if (!asset) throw new Error('ASSET_NOT_FOUND');

    // Only local assets can be deleted via upload gateway
    if (asset.providerType !== 'local') throw new Error('NOT_LOCAL_ASSET');

    // Access check
    if (!isSuperAdmin(user.role)) {
      const accessible = asset.ownerScope === 'branch' && asset.branchId === user.branchId;
      if (!accessible) throw new Error('ACCESS_DENIED');
    }

    // Resolve absolute path and delete from disk
    const absolutePath = resolveAbsoluteFromUrl(asset.fileUrl);
    assertNoPathTraversal(absolutePath);
    const diskResult = await deleteFileFromDisk(absolutePath);

    // Soft-deactivate MediaAsset regardless of disk result
    const updated = await prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data:  { isActive: false },
      select: ASSET_SELECT,
    });

    if (diskResult.warning) {
      console.warn(`[UploadGateway] ${diskResult.warning} — assetId=${mediaAssetId}`);
    }
    console.log(`[UploadGateway] File deleted — assetId=${mediaAssetId}, diskDeleted=${diskResult.deleted}`);
    return { asset: updated, diskDeleted: diskResult.deleted, warning: diskResult.warning };
  },

  // ─── 4. Replace uploaded file ────────────────────────────────────────────────
  replaceFile: async (
    mediaAssetId: number,
    user: AuthPayload,
    file: Express.Multer.File,
    uploadCategory: string,
  ) => {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } });
    if (!asset) throw new Error('ASSET_NOT_FOUND');
    if (asset.providerType !== 'local') throw new Error('NOT_LOCAL_ASSET');

    // Access check
    if (!isSuperAdmin(user.role)) {
      const accessible = asset.ownerScope === 'branch' && asset.branchId === user.branchId;
      if (!accessible) throw new Error('ACCESS_DENIED');
    }

    // Validate new file type
    const category = validateFileType(file.originalname, file.mimetype, uploadCategory);

    // Build new destination
    const storageDir = buildStorageDir(
      asset.ownerScope as 'global' | 'branch',
      category,
      asset.branchId ?? undefined,
    );
    await ensureDir(storageDir);

    const safeFilename = buildSafeFilename(file.originalname);
    const destPath     = path.join(storageDir, safeFilename);
    assertNoPathTraversal(destPath);

    // Write new file
    await fsp.writeFile(destPath, file.buffer);

    // Delete old file (best-effort)
    const oldAbsPath = resolveAbsoluteFromUrl(asset.fileUrl);
    const diskResult = await deleteFileFromDisk(oldAbsPath);

    const newFileUrl    = buildFileUrl(destPath);
    const newFileSizeKb = Math.ceil(file.size / 1024);

    const updated = await prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        fileUrl:    newFileUrl,
        mimeType:   file.mimetype,
        fileSizeKb: newFileSizeKb,
        mediaType:  CATEGORY_TO_MEDIA_TYPE[category],
      },
      select: ASSET_SELECT,
    });

    console.log(`[UploadGateway] File replaced — assetId=${mediaAssetId}, oldDiskDeleted=${diskResult.deleted}`);
    return { asset: updated, fileUrl: newFileUrl };
  },
};
