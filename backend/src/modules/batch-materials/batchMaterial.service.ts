import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { hasGlobalScope } from '../../common/utils/scope.util';
import { assertTeacherBatchAccess } from '../../common/utils/teacher-scope.util';
import { getStudentRecord } from '../../common/utils/student-scope.util';
import { ROLES } from '../../common/roles';

const MATERIAL_SELECT = {
  id: true,
  batchId: true,
  branchId: true,
  title: true,
  description: true,
  materialType: true,
  fileUrl: true,
  externalUrl: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
  mediaAsset: { select: { id: true, title: true, mediaType: true, fileUrl: true, mimeType: true, fileSizeKb: true } },
  createdBy: { select: { id: true, name: true } },
  batch: { select: { id: true, name: true, branch: { select: { id: true, name: true } }, course: { select: { id: true, name: true, code: true } } } },
};

const VALID_TYPES = new Set(['pdf', 'ppt', 'document', 'video', 'image', 'link']);

function cleanText(value: unknown): string {
  return String(value ?? '').trim();
}

function assertBranchAccess(user: AuthPayload, branchId: number): void {
  if (!hasGlobalScope(user) && branchId !== user.branchId) throw new Error('ACCESS_DENIED');
}

async function assertStaffBatchAccess(user: AuthPayload, batchId: number) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId }, select: { id: true, branchId: true } });
  if (!batch) throw new Error('BATCH_NOT_FOUND');
  assertBranchAccess(user, batch.branchId);
  await assertTeacherBatchAccess(user, batchId);
  return batch;
}

async function assertStudentBatchAccess(user: AuthPayload, batchId: number) {
  const record = await getStudentRecord(user);
  if (!record) throw new Error('STUDENT_RECORD_NOT_FOUND');

  const assignment = await prisma.batchStudent.findFirst({
    where: { batchId, studentId: record.studentId, status: 'active' },
    select: { id: true },
  });
  if (!assignment) throw new Error('ACCESS_DENIED');
  return record;
}

export const batchMaterialService = {
  listForBatch: async (user: AuthPayload, batchId: number) => {
    if (user.role === ROLES.STUDENT) {
      await assertStudentBatchAccess(user, batchId);
    } else {
      await assertStaffBatchAccess(user, batchId);
    }

    return prisma.batchMaterial.findMany({
      where: {
        batchId,
        ...(user.role === ROLES.STUDENT ? { isPublished: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: MATERIAL_SELECT,
    });
  },

  listMine: async (user: AuthPayload) => {
    const where = user.role === ROLES.TEACHER
      ? { createdByUserId: user.userId }
      : hasGlobalScope(user)
        ? {}
        : { branchId: user.branchId as number };

    return prisma.batchMaterial.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: MATERIAL_SELECT,
    });
  },

  create: async (
    user: AuthPayload,
    data: {
      batchId: number;
      title: string;
      description?: string;
      materialType: string;
      mediaAssetId?: number | null;
      externalUrl?: string | null;
      isPublished?: boolean;
    },
  ) => {
    const title = cleanText(data.title);
    const description = cleanText(data.description);
    const materialType = cleanText(data.materialType);
    const externalUrl = cleanText(data.externalUrl);

    if (!title || !materialType || !VALID_TYPES.has(materialType)) throw new Error('INVALID_INPUT');
    if (!data.mediaAssetId && !externalUrl) throw new Error('MATERIAL_TARGET_REQUIRED');

    const batch = await assertStaffBatchAccess(user, data.batchId);

    let mediaAsset: { id: number; fileUrl: string; branchId: number | null; ownerScope: string; createdByUserId: number | null } | null = null;
    if (data.mediaAssetId) {
      mediaAsset = await prisma.mediaAsset.findUnique({
        where: { id: data.mediaAssetId },
        select: { id: true, fileUrl: true, branchId: true, ownerScope: true, createdByUserId: true },
      });
      if (!mediaAsset || !mediaAsset.fileUrl) throw new Error('MEDIA_ASSET_NOT_FOUND');
      if (mediaAsset.ownerScope === 'branch' && mediaAsset.branchId !== batch.branchId) throw new Error('ACCESS_DENIED');
      if (user.role === ROLES.TEACHER && mediaAsset.createdByUserId !== user.userId) throw new Error('ACCESS_DENIED');
    }

    return prisma.batchMaterial.create({
      data: {
        batchId: data.batchId,
        branchId: batch.branchId,
        title,
        description: description || null,
        materialType,
        mediaAssetId: mediaAsset?.id ?? null,
        fileUrl: mediaAsset?.fileUrl ?? null,
        externalUrl: externalUrl || null,
        isPublished: data.isPublished ?? true,
        createdByUserId: user.userId,
      },
      select: MATERIAL_SELECT,
    });
  },

  setPublished: async (user: AuthPayload, id: number, isPublished: boolean) => {
    const material = await prisma.batchMaterial.findUnique({ where: { id }, select: { id: true, batchId: true, createdByUserId: true } });
    if (!material) throw new Error('MATERIAL_NOT_FOUND');
    await assertStaffBatchAccess(user, material.batchId);
    if (user.role === ROLES.TEACHER && material.createdByUserId !== user.userId) throw new Error('ACCESS_DENIED');

    return prisma.batchMaterial.update({
      where: { id },
      data: { isPublished },
      select: MATERIAL_SELECT,
    });
  },
};
