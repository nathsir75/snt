import prisma from '../../db/prisma';
import { AuthPayload } from '../types';
import { ROLES } from '../roles';
import { hasGlobalScope } from './scope.util';

/**
 * Returns the set of batchIds the teacher is assigned to.
 * For super_admin / branch_admin — returns null (no restriction).
 * For teacher — returns only their assigned batch IDs.
 * Throws ACCESS_DENIED if teacher has no assignments.
 */
export async function getTeacherBatchIds(user: AuthPayload): Promise<number[] | null> {
  if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.BRANCH_ADMIN) {
    return null; // unrestricted
  }

  if (user.role !== ROLES.TEACHER) {
    return null; // counselor etc — handled by branch scope
  }

  const assignments = await prisma.teacherBatchAssignment.findMany({
    where:  {
      userId: user.userId,
      ...(hasGlobalScope(user) ? {} : { branchId: user.branchId as number }),
    },
    select: { batchId: true },
  });

  const ids = assignments.map((a) => a.batchId);
  console.log(`[TeacherScope] userId=${user.userId} assigned batchIds: [${ids.join(', ')}]`);
  return ids; // may be empty — callers decide how to handle
}

/**
 * Asserts a teacher is assigned to a specific batch.
 * No-op for super_admin / branch_admin.
 */
export async function assertTeacherBatchAccess(user: AuthPayload, batchId: number): Promise<void> {
  if (user.role !== ROLES.TEACHER) return;

  const assignment = await prisma.teacherBatchAssignment.findUnique({
    where: { userId_batchId: { userId: user.userId, batchId } },
  });

  if (!assignment) {
    console.warn(`[TeacherScope] Access denied — userId=${user.userId} not assigned to batchId=${batchId}`);
    throw new Error('TEACHER_NOT_ASSIGNED');
  }
}

/**
 * For a teacher: returns the courseIds of their assigned batches.
 * Used to scope LMS content access.
 */
export async function getTeacherCourseIds(user: AuthPayload): Promise<number[] | null> {
  if (user.role !== ROLES.TEACHER) return null;

  const assignments = await prisma.teacherBatchAssignment.findMany({
    where:   {
      userId: user.userId,
      ...(hasGlobalScope(user) ? {} : { branchId: user.branchId as number }),
    },
    include: { batch: { select: { courseId: true } } },
  });

  const courseIds = [...new Set(assignments.map((a) => a.batch.courseId))];
  console.log(`[TeacherScope] userId=${user.userId} assigned courseIds: [${courseIds.join(', ')}]`);
  return courseIds;
}
