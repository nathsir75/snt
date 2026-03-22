import prisma from '../../db/prisma';
import { AuthPayload } from '../types';
import { ROLES } from '../roles';

/**
 * Resolves the Student record for a logged-in student user.
 *
 * Lookup priority:
 *  1. Student.userId = user.userId  (direct FK — fast, reliable)
 *  2. Student.email  = User.email   (legacy fallback for records created before userId FK existed)
 *
 * Returns null for non-student roles.
 */
export async function getStudentRecord(
  user: AuthPayload,
): Promise<{ studentId: number; branchId: number } | null> {
  if (user.role !== ROLES.STUDENT) return null;

  // Priority 1: direct userId link
  const byUserId = await prisma.student.findUnique({
    where:  { userId: user.userId },
    select: { id: true, branchId: true },
  });
  if (byUserId) {
    console.log(`[StudentScope] Resolved via userId — userId=${user.userId}, studentId=${byUserId.id}`);
    return { studentId: byUserId.id, branchId: byUserId.branchId };
  }

  // Priority 2: email-based fallback
  const userRecord = await prisma.user.findUnique({
    where:  { id: user.userId },
    select: { email: true },
  });
  if (!userRecord) throw new Error('USER_NOT_FOUND');

  if (userRecord.email) {
    const byEmail = await prisma.student.findFirst({
      where:  { email: userRecord.email, branchId: user.branchId as number },
      select: { id: true, branchId: true },
    });
    if (byEmail) {
      console.log(`[StudentScope] Resolved via email fallback — userId=${user.userId}, studentId=${byEmail.id}`);
      // Back-fill userId so future lookups use the fast path
      await prisma.student.update({
        where: { id: byEmail.id },
        data:  { userId: user.userId },
      }).catch(() => { /* ignore if another request already set it */ });
      return { studentId: byEmail.id, branchId: byEmail.branchId };
    }
  }

  console.warn(`[StudentScope] No Student record for userId=${user.userId}`);
  return null;
}

/**
 * Returns the courseIds the student is enrolled in via active BatchStudent records.
 * Used to gate LMS content access.
 */
export async function getStudentCourseIds(studentId: number): Promise<number[]> {
  const batchStudents = await prisma.batchStudent.findMany({
    where:   { studentId, status: 'active' },
    include: { batch: { select: { courseId: true } } },
  });

  const courseIds = [...new Set(batchStudents.map((bs) => bs.batch.courseId))];
  console.log(`[StudentScope] studentId=${studentId} enrolled courseIds: [${courseIds.join(', ')}]`);
  return courseIds;
}

/**
 * Asserts a student is enrolled in a course (via their active batch).
 * No-op for admin roles.
 */
export async function assertStudentCourseAccess(
  user: AuthPayload,
  courseId: number,
): Promise<void> {
  if (user.role !== ROLES.STUDENT) return;

  const record = await getStudentRecord(user);
  if (!record) return;

  const courseIds = await getStudentCourseIds(record.studentId);
  if (!courseIds.includes(courseId)) {
    console.warn(
      `[StudentScope] Access denied — studentId=${record.studentId} not enrolled in courseId=${courseId}`,
    );
    throw new Error('ACCESS_DENIED');
  }
}

/**
 * Asserts a student owns a session (session's course must be in their enrolled courses).
 * No-op for admin roles.
 */
export async function assertStudentSessionAccess(
  user: AuthPayload,
  sessionCourseId: number,
): Promise<void> {
  return assertStudentCourseAccess(user, sessionCourseId);
}
