import prisma from '../../db/prisma';
import { isSuperAdmin } from '../../common/utils/scope.util';
import { createBranchAlert } from '../alerts/alert.service';
import { AuthPayload } from '../../common/types';
import { getTeacherCourseIds } from '../../common/utils/teacher-scope.util';
import { assertStudentCourseAccess, assertStudentSessionAccess } from '../../common/utils/student-scope.util';
import { ROLES } from '../../common/roles';

const VALID_CONTENT_TYPES = ['pdf', 'ppt', 'video', 'lab'] as const;
type ContentType = (typeof VALID_CONTENT_TYPES)[number];

// ─── Selects ─────────────────────────────────────────────────────────────────

const CONTENT_ITEM_SELECT = {
  id:           true,
  type:         true,
  title:        true,
  fileUrl:      true,
  thumbnailUrl: true,
  isPreview:    true,
  createdAt:    true,
  updatedAt:    true,
};

const SESSION_SELECT = {
  id:              true,
  title:           true,
  order:           true,
  durationMinutes: true,
  createdAt:       true,
  updatedAt:       true,
};

const COURSE_CONTENT_SELECT = {
  id:          true,
  courseId:    true,
  title:       true,
  description: true,
  isPublished: true,
  createdAt:   true,
  updatedAt:   true,
  course:      { select: { id: true, name: true, code: true } },
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const lmsService = {

  // ─── 1. Create course content ───────────────────────────────────────────────
  createCourseContent: async (data: {
    courseId:    number;
    title:       string;
    description?: string;
  }) => {
    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course) throw new Error('COURSE_NOT_FOUND');

    const content = await prisma.courseContent.create({
      data: {
        courseId:    data.courseId,
        title:       data.title,
        description: data.description ?? null,
      },
      select: COURSE_CONTENT_SELECT,
    });

    console.log(`[LmsService] Course content created — id=${content.id}, courseId=${data.courseId}`);
    return content;
  },

  // ─── 2. Add session ─────────────────────────────────────────────────────────
  addSession: async (data: {
    courseContentId: number;
    title:           string;
    order:           number;
    durationMinutes?: number;
  }) => {
    const content = await prisma.courseContent.findUnique({ where: { id: data.courseContentId } });
    if (!content) throw new Error('COURSE_CONTENT_NOT_FOUND');

    // Enforce unique order per courseContent
    const existing = await prisma.session.findUnique({
      where: { courseContentId_order: { courseContentId: data.courseContentId, order: data.order } },
    });
    if (existing) throw new Error('SESSION_ORDER_CONFLICT');

    const session = await prisma.session.create({
      data: {
        courseContentId: data.courseContentId,
        title:           data.title,
        order:           data.order,
        durationMinutes: data.durationMinutes ?? null,
      },
      select: { ...SESSION_SELECT, courseContentId: true },
    });

    console.log(`[LmsService] Session added — id=${session.id}, courseContentId=${data.courseContentId}, order=${data.order}`);
    return session;
  },

  // ─── 3. Add content item ────────────────────────────────────────────────────
  addContentItem: async (data: {
    sessionId:    number;
    type:         string;
    title:        string;
    fileUrl:      string;
    thumbnailUrl?: string;
    isPreview?:   boolean;
  }) => {
    if (!VALID_CONTENT_TYPES.includes(data.type as ContentType)) {
      throw new Error('INVALID_CONTENT_TYPE');
    }

    const session = await prisma.session.findUnique({ where: { id: data.sessionId } });
    if (!session) throw new Error('SESSION_NOT_FOUND');

    const item = await prisma.contentItem.create({
      data: {
        sessionId:    data.sessionId,
        type:         data.type,
        title:        data.title,
        fileUrl:      data.fileUrl,
        thumbnailUrl: data.thumbnailUrl ?? null,
        isPreview:    data.isPreview    ?? false,
      },
      select: { ...CONTENT_ITEM_SELECT, sessionId: true },
    });

    console.log(`[LmsService] Content item added — id=${item.id}, sessionId=${data.sessionId}, type=${data.type}`);
    return item;
  },

  // ─── 4. Publish course content ──────────────────────────────────────────────
  publishCourseContent: async (id: number) => {
    const content = await prisma.courseContent.findUnique({ where: { id } });
    if (!content) throw new Error('COURSE_CONTENT_NOT_FOUND');
    if (content.isPublished) throw new Error('ALREADY_PUBLISHED');

    const updated = await prisma.courseContent.update({
      where: { id },
      data:  { isPublished: true },
      select: COURSE_CONTENT_SELECT,
    });

    // Fire alert for every active branch — fire-and-forget
    const branches = await prisma.branch.findMany({
      where:  { status: 'active' },
      select: { id: true },
    });

    for (const branch of branches) {
      createBranchAlert({
        type:       'system',
        title:      'New course content published',
        message:    `"${updated.title}" is now available for ${updated.course.name}`,
        branchId:   branch.id,
        entityType: 'course_content',
        entityId:   id,
        metadata:   { courseId: updated.courseId, courseName: updated.course.name },
      }).catch((err) =>
        console.error(`[LmsService] Alert failed for branchId=${branch.id}:`, err),
      );
    }

    console.log(`[LmsService] Course content published — id=${id}, alertsSent=${branches.length}`);
    return updated;
  },

  // ─── 5. Get full course content (nested) ────────────────────────────────────
  getCourseContent: async (courseId: number, role: string, user?: AuthPayload) => {
    // Teacher: verify courseId is in their assigned courses
    if (role === ROLES.TEACHER && user) {
      const courseIds = await getTeacherCourseIds(user);
      if (!courseIds || !courseIds.includes(courseId)) {
        console.warn(`[LmsService] Teacher userId=${user.userId} not assigned to courseId=${courseId}`);
        throw new Error('ACCESS_DENIED');
      }
    }

    // Student: verify they are enrolled in a batch for this course
    if (role === ROLES.STUDENT && user) {
      await assertStudentCourseAccess(user, courseId);
    }

    const where: { courseId: number; isPublished?: true } = { courseId };
    if (!isSuperAdmin(role)) where.isPublished = true;

    const content = await prisma.courseContent.findFirst({
      where,
      select: COURSE_CONTENT_SELECT,
    });
    if (!content) throw new Error('COURSE_CONTENT_NOT_FOUND');

    const sessions = await prisma.session.findMany({
      where:   { courseContentId: content.id },
      orderBy: { order: 'asc' },
      select: {
        ...SESSION_SELECT,
        contentItems: {
          orderBy: { createdAt: 'asc' },
          select:  CONTENT_ITEM_SELECT,
        },
      },
    });

    console.log(`[LmsService] Course content fetched — courseId=${courseId}, role=${role}, sessions=${sessions.length}`);
    return { courseContent: content, sessions };
  },

  // ─── 6. Get session detail ──────────────────────────────────────────────────
  getSession: async (id: number, role: string, user?: AuthPayload) => {
    const session = await prisma.session.findUnique({
      where:  { id },
      select: {
        ...SESSION_SELECT,
        courseContentId: true,
        courseContent: { select: { id: true, isPublished: true, courseId: true } },
        contentItems: {
          orderBy: { createdAt: 'asc' },
          select:  CONTENT_ITEM_SELECT,
        },
      },
    });
    if (!session) throw new Error('SESSION_NOT_FOUND');

    if (!isSuperAdmin(role) && !session.courseContent.isPublished) {
      throw new Error('COURSE_CONTENT_NOT_FOUND');
    }

    // Teacher: verify they are assigned to a batch using this course
    if (role === ROLES.TEACHER && user) {
      const courseIds = await getTeacherCourseIds(user);
      if (!courseIds || !courseIds.includes(session.courseContent.courseId)) {
        console.warn(`[LmsService] Teacher userId=${user.userId} not assigned to courseId=${session.courseContent.courseId}`);
        throw new Error('ACCESS_DENIED');
      }
    }

    // Student: verify they are enrolled in a batch for this course
    if (role === ROLES.STUDENT && user) {
      await assertStudentSessionAccess(user, session.courseContent.courseId);
    }

    console.log(`[LmsService] Session fetched — id=${id}`);
    return session;
  },

  // ─── 7. Update content item ─────────────────────────────────────────────────
  updateContentItem: async (
    id: number,
    data: Partial<{
      type:         string;
      title:        string;
      fileUrl:      string;
      thumbnailUrl: string;
      isPreview:    boolean;
    }>,
  ) => {
    if (data.type && !VALID_CONTENT_TYPES.includes(data.type as ContentType)) {
      throw new Error('INVALID_CONTENT_TYPE');
    }

    const item = await prisma.contentItem.findUnique({ where: { id } });
    if (!item) throw new Error('CONTENT_ITEM_NOT_FOUND');

    const updated = await prisma.contentItem.update({
      where: { id },
      data,
      select: { ...CONTENT_ITEM_SELECT, sessionId: true },
    });

    console.log(`[LmsService] Content item updated — id=${id}`);
    return updated;
  },

  // ─── 8. Delete content item ─────────────────────────────────────────────────
  deleteContentItem: async (id: number) => {
    const item = await prisma.contentItem.findUnique({ where: { id } });
    if (!item) throw new Error('CONTENT_ITEM_NOT_FOUND');

    await prisma.contentItem.delete({ where: { id } });
    console.log(`[LmsService] Content item deleted — id=${id}`);
    return { deleted: true, id };
  },
};
