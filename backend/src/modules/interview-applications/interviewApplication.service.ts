import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { getBranchFilter, hasGlobalScope } from '../../common/utils/scope.util';
import { createBranchAlert } from '../alerts/alert.service';

const VALID_STATUSES = ['applied', 'shortlisted', 'rejected', 'selected'] as const;

const APP_SELECT = {
  id:        true,
  status:    true,
  remarks:   true,
  createdAt: true,
  updatedAt: true,
  interview: {
    select: {
      id:            true,
      interviewDate: true,
      mode:          true,
      jobOpening: { select: { id: true, title: true, company: { select: { id: true, name: true } } } },
    },
  },
  student: { select: { id: true, fullName: true, mobile: true, course: true, branchId: true } },
};

export const interviewApplicationService = {
  apply: async (
    user: AuthPayload,
    data: { interviewId: number; studentId: number; remarks?: string },
  ) => {
    const student = await prisma.student.findUnique({ where: { id: data.studentId } });
    if (!student) throw new Error('STUDENT_NOT_FOUND');

    if (!hasGlobalScope(user) && student.branchId !== user.branchId) {
      console.warn(`[InterviewAppService] Branch access denied — studentId=${data.studentId}`);
      throw new Error('ACCESS_DENIED');
    }

    const interview = await prisma.interview.findUnique({ where: { id: data.interviewId } });
    if (!interview) throw new Error('INTERVIEW_NOT_FOUND');

    const existing = await prisma.interviewApplication.findUnique({
      where: { interviewId_studentId: { interviewId: data.interviewId, studentId: data.studentId } },
    });
    if (existing) throw new Error('DUPLICATE_APPLICATION');

    const application = await prisma.interviewApplication.create({
      data: {
        interviewId: data.interviewId,
        studentId:   data.studentId,
        remarks:     data.remarks ?? null,
      },
      select: APP_SELECT,
    });

    console.log(`[InterviewAppService] Student applied — studentId=${data.studentId}, interviewId=${data.interviewId}`);
    return application;
  },

  list: async (user: AuthPayload, filters: { interviewId?: number; status?: string }) => {
    const branchFilter = getBranchFilter(user);
    // For branch_admin, scope via student's branchId
    const where: Record<string, unknown> = {};
    if (!hasGlobalScope(user)) {
      where['student'] = { branchId: user.branchId };
    }
    if (filters.interviewId) where['interviewId'] = filters.interviewId;
    if (filters.status)      where['status']      = filters.status;

    return prisma.interviewApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select:  APP_SELECT,
    });
  },

  updateStatus: async (
    id: number,
    data: { status: string; remarks?: string },
  ) => {
    if (!VALID_STATUSES.includes(data.status as any)) throw new Error('INVALID_APPLICATION_STATUS');

    const app = await prisma.interviewApplication.findUnique({
      where:  { id },
      select: { id: true, studentId: true, student: { select: { fullName: true, branchId: true } }, interview: { select: { jobOpening: { select: { company: { select: { name: true } } } } } } },
    });
    if (!app) throw new Error('APPLICATION_NOT_FOUND');

    const updated = await prisma.interviewApplication.update({
      where: { id },
      data:  { status: data.status, remarks: data.remarks ?? undefined },
      select: APP_SELECT,
    });

    if (data.status === 'selected') {
      createBranchAlert({
        type:       'system',
        title:      'Student selected in interview',
        message:    `${app.student.fullName} has been selected by ${app.interview.jobOpening.company.name}`,
        branchId:   app.student.branchId,
        entityType: 'interview_application',
        entityId:   id,
        metadata:   { status: data.status },
      }).catch((err) =>
        console.error(`[InterviewAppService] Alert failed for application id=${id}:`, err),
      );
      console.log(`[InterviewAppService] Student selected — applicationId=${id}, studentId=${app.studentId}`);
    }

    return updated;
  },
};

