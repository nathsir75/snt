import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { isSuperAdmin } from '../../common/utils/scope.util';

const COURSE_SELECT = {
  id: true,
  name: true,
  code: true,
  description: true,
  durationMonths: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

export const courseService = {
  createCourse: async (data: {
    name: string;
    code: string;
    description?: string;
    durationMonths: number;
  }) => {
    if (data.durationMonths <= 0) throw new Error('INVALID_DURATION');

    const existing = await prisma.course.findFirst({
      where: { OR: [{ name: data.name }, { code: data.code }] },
    });
    if (existing?.name === data.name) throw new Error('DUPLICATE_NAME');
    if (existing?.code === data.code) throw new Error('DUPLICATE_CODE');

    const course = await prisma.course.create({
      data: {
        name:           data.name,
        code:           data.code,
        description:    data.description ?? null,
        durationMonths: data.durationMonths,
      },
      select: COURSE_SELECT,
    });

    console.log(`[CourseService] Course created: ${course.name} (${course.code})`);
    return course;
  },

  getAllCourses: async (user: AuthPayload) => {
    const filter = isSuperAdmin(user.role) ? {} : { isActive: true };
    if (!isSuperAdmin(user.role)) {
      console.log(`[CourseService] Active-only filter applied for role: ${user.role}`);
    }
    return prisma.course.findMany({
      where: filter,
      orderBy: { name: 'asc' },
      select: COURSE_SELECT,
    });
  },

  getCourseById: async (id: number, user: AuthPayload) => {
    const filter = isSuperAdmin(user.role) ? { id } : { id, isActive: true };
    const course = await prisma.course.findFirst({ where: filter, select: COURSE_SELECT });
    if (!course) throw new Error('COURSE_NOT_FOUND');
    return course;
  },

  updateCourse: async (
    id: number,
    data: {
      name?: string;
      code?: string;
      description?: string;
      durationMonths?: number;
      isActive?: boolean;
    },
  ) => {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) throw new Error('COURSE_NOT_FOUND');

    if (data.durationMonths !== undefined && data.durationMonths <= 0) {
      throw new Error('INVALID_DURATION');
    }

    if (data.name && data.name !== course.name) {
      const dup = await prisma.course.findUnique({ where: { name: data.name } });
      if (dup) throw new Error('DUPLICATE_NAME');
    }

    if (data.code && data.code !== course.code) {
      const dup = await prisma.course.findUnique({ where: { code: data.code } });
      if (dup) throw new Error('DUPLICATE_CODE');
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        ...(data.name           !== undefined && { name: data.name }),
        ...(data.code           !== undefined && { code: data.code }),
        ...(data.description    !== undefined && { description: data.description }),
        ...(data.durationMonths !== undefined && { durationMonths: data.durationMonths }),
        ...(data.isActive       !== undefined && { isActive: data.isActive }),
      },
      select: COURSE_SELECT,
    });

    console.log(`[CourseService] Course updated: id=${id}, isActive=${updated.isActive}`);
    return updated;
  },
};
