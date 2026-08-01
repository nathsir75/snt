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
  contentCategory: true,
  lectureDate: true,
  fileUrl: true,
  externalUrl: true,
  isPublished: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  mediaAsset: { select: { id: true, title: true, mediaType: true, fileUrl: true, mimeType: true, fileSizeKb: true } },
  createdBy: { select: { id: true, name: true } },
  batch: { select: { id: true, name: true, branch: { select: { id: true, name: true } }, course: { select: { id: true, name: true, code: true } } } },
};

const VALID_TYPES = new Set(['pdf', 'ppt', 'document', 'video', 'image', 'link']);
const VALID_CATEGORIES = new Set(['recorded_lecture', 'recommended_video', 'study_resource']);

function cleanText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeContentCategory(value: unknown): string {
  const category = cleanText(value || 'study_resource');
  if (!VALID_CATEGORIES.has(category)) throw new Error('INVALID_CONTENT_CATEGORY');
  return category;
}

function normalizeLectureDate(value: unknown, contentCategory: string): Date | null {
  const raw = cleanText(value);
  if (!raw) {
    if (contentCategory === 'recorded_lecture') throw new Error('LECTURE_DATE_REQUIRED');
    return null;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error('INVALID_LECTURE_DATE');
  return date;
}

function assertBranchAccess(user: AuthPayload, branchId: number): void {
  if (!hasGlobalScope(user) && branchId !== user.branchId) throw new Error('ACCESS_DENIED');
}

function isYouTubeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    return host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com';
  } catch {
    return false;
  }
}

async function assertStaffBatchAccess(user: AuthPayload, batchId: number) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId }, select: { id: true, branchId: true } });
  if (!batch) throw new Error('BATCH_NOT_FOUND');
  assertBranchAccess(user, batch.branchId);
  await assertTeacherBatchAccess(user, batchId);
  return batch;
}

async function assertMaterialAccess(user: AuthPayload, id: number) {
  const material = await prisma.batchMaterial.findUnique({
    where: { id },
    select: {
      id: true,
      batchId: true,
      branchId: true,
      createdByUserId: true,
      materialType: true,
      contentCategory: true,
      lectureDate: true,
      mediaAssetId: true,
      fileUrl: true,
      externalUrl: true,
    },
  });
  if (!material) throw new Error('MATERIAL_NOT_FOUND');
  await assertStaffBatchAccess(user, material.batchId);
  if (user.role === ROLES.TEACHER && material.createdByUserId !== user.userId) throw new Error('ACCESS_DENIED');
  return material;
}

async function resolveMediaAsset(
  user: AuthPayload,
  batchBranchId: number,
  mediaAssetId?: number | null,
) {
  if (!mediaAssetId) return null;
  const mediaAsset = await prisma.mediaAsset.findUnique({
    where: { id: mediaAssetId },
    select: { id: true, fileUrl: true, branchId: true, ownerScope: true, createdByUserId: true },
  });
  if (!mediaAsset || !mediaAsset.fileUrl) throw new Error('MEDIA_ASSET_NOT_FOUND');
  if (mediaAsset.ownerScope === 'branch' && mediaAsset.branchId !== batchBranchId) throw new Error('ACCESS_DENIED');
  if (user.role === ROLES.TEACHER && mediaAsset.createdByUserId !== user.userId) throw new Error('ACCESS_DENIED');
  return mediaAsset;
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
        archivedAt: null,
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
      where: { ...where, archivedAt: null },
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
      contentCategory?: string;
      lectureDate?: string | null;
    },
  ) => {
    const title = cleanText(data.title);
    const description = cleanText(data.description);
    const materialType = cleanText(data.materialType);
    const externalUrl = cleanText(data.externalUrl);
    const contentCategory = normalizeContentCategory(data.contentCategory);
    const lectureDate = normalizeLectureDate(data.lectureDate, contentCategory);

    if (!title || !materialType || !VALID_TYPES.has(materialType)) throw new Error('INVALID_INPUT');
    if (materialType === 'link' && !externalUrl) throw new Error('MATERIAL_TARGET_REQUIRED');
    if (materialType !== 'link' && !data.mediaAssetId) throw new Error('MATERIAL_TARGET_REQUIRED');
    if (materialType === 'link' && !isYouTubeUrl(externalUrl)) throw new Error('INVALID_YOUTUBE_URL');

    const batch = await assertStaffBatchAccess(user, data.batchId);
    const mediaAsset = materialType === 'link'
      ? null
      : await resolveMediaAsset(user, batch.branchId, data.mediaAssetId);

    return prisma.batchMaterial.create({
      data: {
        batchId: data.batchId,
        branchId: batch.branchId,
        title,
        description: description || null,
        materialType,
        contentCategory,
        lectureDate,
        mediaAssetId: materialType === 'link' ? null : mediaAsset?.id ?? null,
        fileUrl: materialType === 'link' ? null : mediaAsset?.fileUrl ?? null,
        externalUrl: materialType === 'link' ? externalUrl : null,
        isPublished: data.isPublished ?? true,
        createdByUserId: user.userId,
      },
      select: MATERIAL_SELECT,
    });
  },

  update: async (
    user: AuthPayload,
    id: number,
    data: {
      title?: string;
      description?: string | null;
      materialType?: string;
      mediaAssetId?: number | null;
      externalUrl?: string | null;
      isPublished?: boolean;
      contentCategory?: string;
      lectureDate?: string | null;
    },
  ) => {
    const material = await assertMaterialAccess(user, id);
    const batch = await prisma.batch.findUnique({ where: { id: material.batchId }, select: { branchId: true } });
    if (!batch) throw new Error('BATCH_NOT_FOUND');

    const materialType = data.materialType !== undefined ? cleanText(data.materialType) : undefined;
    if (materialType !== undefined && (!materialType || !VALID_TYPES.has(materialType))) throw new Error('INVALID_INPUT');
    const finalType = materialType ?? material.materialType;
    const contentCategory = data.contentCategory !== undefined ? normalizeContentCategory(data.contentCategory) : undefined;
    const finalCategory = contentCategory ?? material.contentCategory;
    const lectureDate = data.lectureDate !== undefined
      ? normalizeLectureDate(data.lectureDate, finalCategory)
      : material.lectureDate;
    if (finalCategory === 'recorded_lecture' && !lectureDate) throw new Error('LECTURE_DATE_REQUIRED');

    const title = data.title !== undefined ? cleanText(data.title) : undefined;
    if (data.title !== undefined && !title) throw new Error('INVALID_INPUT');

    const externalUrl = data.externalUrl !== undefined ? cleanText(data.externalUrl) : undefined;
    const finalExternalUrl = externalUrl ?? material.externalUrl ?? '';
    const mediaAsset = data.mediaAssetId !== undefined
      ? await resolveMediaAsset(user, batch.branchId, data.mediaAssetId)
      : undefined;

    if (finalType === 'link') {
      if (!finalExternalUrl) throw new Error('MATERIAL_TARGET_REQUIRED');
      if (!isYouTubeUrl(finalExternalUrl)) throw new Error('INVALID_YOUTUBE_URL');
    }
    if (finalType !== 'link' && !mediaAsset && !material.mediaAssetId && !material.fileUrl) throw new Error('MATERIAL_TARGET_REQUIRED');

    return prisma.batchMaterial.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(data.description !== undefined && { description: cleanText(data.description) || null }),
        ...(materialType !== undefined && { materialType }),
        ...(contentCategory !== undefined && { contentCategory }),
        ...(data.lectureDate !== undefined && { lectureDate }),
        ...(mediaAsset !== undefined && { mediaAssetId: mediaAsset?.id ?? null, fileUrl: mediaAsset?.fileUrl ?? null }),
        ...(externalUrl !== undefined && { externalUrl: externalUrl || null }),
        ...(finalType === 'link' && { mediaAssetId: null, fileUrl: null }),
        ...(finalType !== 'link' && { externalUrl: null }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
        archivedAt: null,
      },
      select: MATERIAL_SELECT,
    });
  },

  setPublished: async (user: AuthPayload, id: number, isPublished: boolean) => {
    await assertMaterialAccess(user, id);

    return prisma.batchMaterial.update({
      where: { id },
      data: { isPublished, ...(isPublished ? { archivedAt: null } : {}) },
      select: MATERIAL_SELECT,
    });
  },

  archive: async (user: AuthPayload, id: number) => {
    await assertMaterialAccess(user, id);

    return prisma.batchMaterial.update({
      where: { id },
      data: { isPublished: false, archivedAt: new Date() },
      select: MATERIAL_SELECT,
    });
  },
};
