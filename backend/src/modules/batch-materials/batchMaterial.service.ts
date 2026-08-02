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
const VALID_PROGRESS_EVENTS = new Set(['start', 'checkpoint', 'complete']);
const VALID_CLARITY_STATUS = new Set(['clear', 'need_revision', 'ask_teacher']);

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

function getYouTubeVideoId(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] ?? null;
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname.startsWith('/watch')) return url.searchParams.get('v');
      if (url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/embed/')) return url.pathname.split('/').filter(Boolean)[1] ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

function youtubeEmbedUrl(value: string | null | undefined): string | null {
  const id = getYouTubeVideoId(value);
  return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=0&playsinline=1&enablejsapi=1` : null;
}

function isLectureMaterial(material: { materialType: string; externalUrl: string | null; contentCategory: string }): boolean {
  return material.materialType === 'link'
    && !!youtubeEmbedUrl(material.externalUrl)
    && ['recorded_lecture', 'recommended_video'].includes(material.contentCategory);
}

function progressPercent(position: number, duration?: number | null): number {
  if (!duration || duration <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((position / duration) * 1000) / 10));
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

async function assertStudentMaterialAccess(user: AuthPayload, materialId: number) {
  const material = await prisma.batchMaterial.findUnique({
    where: { id: materialId },
    select: {
      ...MATERIAL_SELECT,
      createdByUserId: true,
    },
  });
  if (!material || material.archivedAt || !material.isPublished) throw new Error('MATERIAL_NOT_FOUND');
  await assertStudentBatchAccess(user, material.batchId);
  if (!isLectureMaterial(material)) throw new Error('LECTURE_NOT_FOUND');
  return material;
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

  getStudentLecture: async (user: AuthPayload, id: number) => {
    const material = await assertStudentMaterialAccess(user, id);
    const record = await getStudentRecord(user);
    if (!record) throw new Error('STUDENT_RECORD_NOT_FOUND');
    const [previousLectures, feedback, latestProgress] = await Promise.all([
      prisma.batchMaterial.findMany({
        where: {
          batchId: material.batchId,
          isPublished: true,
          archivedAt: null,
          materialType: 'link',
          contentCategory: 'recorded_lecture',
        },
        orderBy: [{ lectureDate: 'desc' }, { createdAt: 'desc' }],
        select: MATERIAL_SELECT,
      }),
      prisma.lectureFeedback.findUnique({
        where: { materialId_studentId: { materialId: id, studentId: record.studentId } },
        select: { id: true, rating: true, clarityStatus: true, comment: true, updatedAt: true },
      }),
      prisma.lectureProgress.findFirst({
        where: { materialId: id, studentId: record.studentId },
        orderBy: { createdAt: 'desc' },
        select: { eventType: true, positionSeconds: true, durationSeconds: true, percentComplete: true, createdAt: true },
      }),
    ]);
    return {
      material: { ...material, youtubeEmbedUrl: youtubeEmbedUrl(material.externalUrl), youtubeVideoId: getYouTubeVideoId(material.externalUrl) },
      previousLectures: previousLectures
        .filter((item) => isLectureMaterial(item))
        .map((item) => ({ id: item.id, title: item.title, lectureDate: item.lectureDate, createdAt: item.createdAt, active: item.id === id })),
      feedback,
      latestProgress,
    };
  },

  recordLectureProgress: async (user: AuthPayload, id: number, data: any) => {
    const material = await assertStudentMaterialAccess(user, id);
    const record = await getStudentRecord(user);
    if (!record) throw new Error('STUDENT_RECORD_NOT_FOUND');
    const eventType = cleanText(data.eventType);
    if (!VALID_PROGRESS_EVENTS.has(eventType)) throw new Error('INVALID_PROGRESS_EVENT');
    const positionSeconds = Math.max(0, Math.floor(Number(data.positionSeconds ?? 0)));
    const durationSeconds = data.durationSeconds === undefined || data.durationSeconds === null ? null : Math.max(0, Math.floor(Number(data.durationSeconds)));
    if (!Number.isFinite(positionSeconds) || (durationSeconds !== null && !Number.isFinite(durationSeconds))) throw new Error('INVALID_PROGRESS_EVENT');
    return prisma.lectureProgress.create({
      data: {
        materialId: id,
        studentId: record.studentId,
        userId: user.userId,
        batchId: material.batchId,
        branchId: material.branchId,
        eventType,
        positionSeconds,
        durationSeconds,
        percentComplete: eventType === 'complete' ? 100 : progressPercent(positionSeconds, durationSeconds),
      },
      select: { id: true, eventType: true, positionSeconds: true, durationSeconds: true, percentComplete: true, createdAt: true },
    });
  },

  submitLectureFeedback: async (user: AuthPayload, id: number, data: any) => {
    const material = await assertStudentMaterialAccess(user, id);
    const record = await getStudentRecord(user);
    if (!record) throw new Error('STUDENT_RECORD_NOT_FOUND');
    const rating = Number(data.rating);
    const clarityStatus = cleanText(data.clarityStatus);
    const comment = cleanText(data.comment).slice(0, 1000);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('INVALID_FEEDBACK');
    if (!VALID_CLARITY_STATUS.has(clarityStatus)) throw new Error('INVALID_FEEDBACK');
    return prisma.lectureFeedback.upsert({
      where: { materialId_studentId: { materialId: id, studentId: record.studentId } },
      create: { materialId: id, studentId: record.studentId, userId: user.userId, batchId: material.batchId, branchId: material.branchId, rating, clarityStatus, comment: comment || null },
      update: { rating, clarityStatus, comment: comment || null },
      select: { id: true, rating: true, clarityStatus: true, comment: true, updatedAt: true },
    });
  },

  getTeacherLectureFeedback: async (user: AuthPayload, id: number) => {
    const material = await prisma.batchMaterial.findUnique({ where: { id }, select: MATERIAL_SELECT });
    if (!material) throw new Error('MATERIAL_NOT_FOUND');
    await assertStaffBatchAccess(user, material.batchId);
    if (!isLectureMaterial(material)) throw new Error('LECTURE_NOT_FOUND');
    const [feedback, progress] = await Promise.all([
      prisma.lectureFeedback.findMany({
        where: { materialId: id },
        orderBy: { updatedAt: 'desc' },
        include: { student: { select: { id: true, fullName: true, mobile: true, email: true } } },
      }),
      prisma.lectureProgress.groupBy({
        by: ['studentId'],
        where: { materialId: id },
        _max: { percentComplete: true, createdAt: true },
      }),
    ]);
    const ratings = feedback.map((item) => item.rating);
    const clarityCounts = feedback.reduce((acc, item) => {
      acc[item.clarityStatus] = (acc[item.clarityStatus] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return {
      material,
      summary: {
        feedbackCount: feedback.length,
        averageRating: ratings.length ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10 : null,
        clarityCounts,
        studentsWithProgress: progress.length,
      },
      comments: feedback.map((item) => ({
        id: item.id,
        rating: item.rating,
        clarityStatus: item.clarityStatus,
        comment: item.comment,
        updatedAt: item.updatedAt,
        student: item.student,
      })),
      progress,
    };
  },
};
