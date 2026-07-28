import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { getStudentRecord, getStudentCourseIds } from '../../common/utils/student-scope.util';

// ─── Shared helper ────────────────────────────────────────────────────────────

async function resolveOwn(user: AuthPayload) {
  const record = await getStudentRecord(user);
  if (!record) throw new Error('STUDENT_RECORD_NOT_FOUND');
  return record;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const studentService = {

  // ── 1. Profile (read) ───────────────────────────────────────────────────────
  getMyProfile: async (user: AuthPayload) => {
    const record = await getStudentRecord(user);

    // No student record linked yet — return structured response so frontend
    // can show a clean onboarding state instead of an error
    if (!record) {
      console.log(`[StudentService] No student record linked — userId=${user.userId}`);
      return { linked: false as const, studentId: null, profile: null };
    }

    const student = await prisma.student.findUnique({
      where:  { id: record.studentId },
      select: {
        id:            true,
        fullName:      true,
        email:         true,
        mobile:        true,
        city:          true,
        course:        true,
        admissionDate: true,
        totalFees:     true,
        discount:      true,
        finalFees:     true,
        branch:        { select: { id: true, name: true, city: true } },
        batchStudents: {
          where:  { status: 'active' },
          select: {
            id:       true,
            status:   true,
            joinedAt: true,
            batch: {
              select: {
                id:       true,
                name:     true,
                isActive: true,
                isCentralProgramme: true,
                course:   { select: { id: true, name: true, code: true } },
              },
            },
          },
          take: 1,
        },
      },
    });
    if (!student) throw new Error('STUDENT_RECORD_NOT_FOUND');

    const activeBatch = student.batchStudents[0] ?? null;
    const courseIds   = await getStudentCourseIds(record.studentId);

    console.log(`[StudentService] Profile fetched — studentId=${record.studentId}`);
    return {
      linked:            true as const,
      studentId:         record.studentId,
      fullName:          student.fullName,
      email:             student.email,
      mobile:            student.mobile,
      city:              student.city,
      course:            student.course,
      admissionDate:     student.admissionDate,
      totalFees:         student.totalFees,
      discount:          student.discount,
      finalFees:         student.finalFees,
      branch:            student.branch,
      activeBatch:       activeBatch
        ? {
            batchStudentId: activeBatch.id,
            batchId:        activeBatch.batch.id,
            batchName:      activeBatch.batch.name,
            isActive:       activeBatch.batch.isActive,
            isCentralProgramme: activeBatch.batch.isCentralProgramme,
            joinedAt:       activeBatch.joinedAt,
            course:         activeBatch.batch.course,
          }
        : null,
      enrolledCourseIds: courseIds,
    };
  },

  // ── 2. Profile (limited update — only mobile and city) ──────────────────────
  updateMyProfile: async (user: AuthPayload, data: { mobile?: string; city?: string }) => {
    const record = await resolveOwn(user);

    // Whitelist: student may only update mobile and city
    const allowed: { mobile?: string; city?: string } = {};
    if (data.mobile !== undefined) {
      if (!/^\d{10}$/.test(data.mobile)) throw new Error('INVALID_MOBILE');
      allowed.mobile = data.mobile;
    }
    if (data.city !== undefined) {
      if (!data.city.trim()) throw new Error('INVALID_CITY');
      allowed.city = data.city.trim();
    }
    if (Object.keys(allowed).length === 0) throw new Error('NO_UPDATABLE_FIELDS');

    const updated = await prisma.student.update({
      where:  { id: record.studentId },
      data:   allowed,
      select: { id: true, fullName: true, mobile: true, city: true, email: true },
    });

    console.log(`[StudentService] Profile updated — studentId=${record.studentId}, fields=${Object.keys(allowed).join(',')}`);
    return updated;
  },

  // ── 3. Fee ledger (own only) ─────────────────────────────────────────────────
  getMyFees: async (user: AuthPayload) => {
    const record  = await resolveOwn(user);
    const student = await prisma.student.findUnique({
      where:  { id: record.studentId },
      select: {
        id:        true,
        fullName:  true,
        course:    true,
        totalFees: true,
        discount:  true,
        finalFees: true,
        branch:    { select: { id: true, name: true } },
      },
    });
    if (!student) throw new Error('STUDENT_RECORD_NOT_FOUND');

    const payments = await prisma.feePayment.findMany({
      where:   { studentId: record.studentId },
      orderBy: { paymentDate: 'asc' },
      select: {
        id:          true,
        amount:      true,
        paymentDate: true,
        paymentMode: true,
        referenceNo: true,
        remarks:     true,
      },
    });

    const totalPaid    = payments.reduce((s, p) => s + p.amount, 0);
    const remainingDue = student.finalFees - totalPaid;

    console.log(`[StudentService] Fee ledger fetched — studentId=${record.studentId}`);
    return { student, payments, totalFees: student.finalFees, totalPaid, remainingDue };
  },

  // ── 4. Results (own only) ────────────────────────────────────────────────────
  getMyResults: async (user: AuthPayload) => {
    const record = await resolveOwn(user);

    const results = await prisma.finalExamResult.findMany({
      where:   { studentId: record.studentId },
      orderBy: { publishedAt: 'desc' },
      select: {
        id:            true,
        marksObtained: true,
        maxMarks:      true,
        resultStatus:  true,
        remarks:       true,
        publishedAt:   true,
        registration:  { select: { id: true, examDate: true, hallTicketNo: true, status: true } },
      },
    });

    console.log(`[StudentService] Results fetched — studentId=${record.studentId}, count=${results.length}`);
    return results;
  },

  // ── 5. Certificates (own only) ───────────────────────────────────────────────
  getMyCertificates: async (user: AuthPayload) => {
    const record = await resolveOwn(user);

    const certs = await prisma.certificateIssue.findMany({
      where:   { studentId: record.studentId },
      orderBy: { issueDate: 'desc' },
      select: {
        id:               true,
        certificateNo:    true,
        verificationCode: true,
        issueDate:        true,
        status:           true,
        result: {
          select: {
            marksObtained: true,
            maxMarks:      true,
            resultStatus:  true,
          },
        },
      },
    });

    console.log(`[StudentService] Certificates fetched — studentId=${record.studentId}, count=${certs.length}`);
    return certs;
  },

  // ── 6. Placements (own only) ─────────────────────────────────────────────────
  getMyPlacements: async (user: AuthPayload) => {
    const record = await resolveOwn(user);

    const placements = await prisma.placement.findMany({
      where:   { studentId: record.studentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id:            true,
        salaryPackage: true,
        joiningDate:   true,
        status:        true,
        createdAt:     true,
        company:    { select: { id: true, name: true, industry: true, location: true } },
        jobOpening: { select: { id: true, title: true } },
      },
    });

    console.log(`[StudentService] Placements fetched — studentId=${record.studentId}, count=${placements.length}`);
    return placements;
  },

  // ── 7. Schedule (own batch's schedule) ──────────────────────────────────────
  getMySchedule: async (user: AuthPayload) => {
    const record = await resolveOwn(user);

    // Get the student's active batch
    const batchStudent = await prisma.batchStudent.findFirst({
      where:  { studentId: record.studentId, status: 'active' },
      select: { batchId: true, batch: { select: { id: true, name: true, course: { select: { name: true } } } } },
    });

    if (!batchStudent) {
      console.log(`[StudentService] No active batch for studentId=${record.studentId}`);
      return { batch: null, schedules: [] };
    }

    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const schedules = await prisma.batchSchedule.findMany({
      where:   { batchId: batchStudent.batchId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      select: {
        id:        true,
        dayOfWeek: true,
        startTime: true,
        endTime:   true,
        room:      true,
      },
    });

    console.log(`[StudentService] Schedule fetched — studentId=${record.studentId}, batchId=${batchStudent.batchId}`);
    return {
      batch:     batchStudent.batch,
      schedules: schedules.map((s) => ({ ...s, dayName: DAY_NAMES[s.dayOfWeek] })),
    };
  },

  // ── 8. Alerts (own branch alerts + direct user alerts) ──────────────────────
  getMyAlerts: async (user: AuthPayload) => {
    const record = await resolveOwn(user);

    const alerts = await prisma.alert.findMany({
      where: {
        OR: [
          { branchId: record.branchId, userId: null },  // branch-wide alerts
          { userId: user.userId },                       // direct user alerts
        ],
      },
      orderBy: { createdAt: 'desc' },
      take:    50,
      select: {
        id:        true,
        type:      true,
        title:     true,
        message:   true,
        isRead:    true,
        createdAt: true,
        entityType: true,
        entityId:   true,
      },
    });

    const unreadCount = alerts.filter((a) => !a.isRead).length;
    console.log(`[StudentService] Alerts fetched — studentId=${record.studentId}, total=${alerts.length}, unread=${unreadCount}`);
    return { alerts, unreadCount };
  },

  // ── 9. Mark alert read (own alerts only) ────────────────────────────────────
  markAlertRead: async (user: AuthPayload, alertId: number) => {
    const record = await resolveOwn(user);

    const alert = await prisma.alert.findUnique({ where: { id: alertId } });
    if (!alert) throw new Error('ALERT_NOT_FOUND');

    // Verify this alert belongs to the student's branch or directly to them
    const accessible =
      (alert.branchId === record.branchId && alert.userId === null) ||
      alert.userId === user.userId;

    if (!accessible) {
      console.warn(`[StudentService] Alert access denied — studentId=${record.studentId}, alertId=${alertId}`);
      throw new Error('ACCESS_DENIED');
    }

    const updated = await prisma.alert.update({
      where:  { id: alertId },
      data:   { isRead: true },
      select: { id: true, isRead: true },
    });

    console.log(`[StudentService] Alert id=${alertId} marked read by studentId=${record.studentId}`);
    return updated;
  },
};
