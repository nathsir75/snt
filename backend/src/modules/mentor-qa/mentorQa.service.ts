import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { ROLES } from '../../common/roles';
import { isSuperAdmin } from '../../common/utils/scope.util';
import { getStudentRecord } from '../../common/utils/student-scope.util';
import { assertTeacherBatchAccess } from '../../common/utils/teacher-scope.util';

const MENTOR_QUESTION_SELECT = {
  id: true,
  liveSessionId: true,
  studentId: true,
  questionText: true,
  answerText: true,
  answeredByUserId: true,
  createdAt: true,
  answeredAt: true,
  student: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  answeredBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

async function getLiveSessionForAccess(liveSessionId: number) {
  const liveSession = await prisma.liveSession.findUnique({
    where: { id: liveSessionId },
    select: {
      id: true,
      batchId: true,
      title: true,
      batch: {
        select: {
          id: true,
          name: true,
          branchId: true,
        },
      },
    },
  });
  if (!liveSession) throw new Error('LIVE_SESSION_NOT_FOUND');
  return liveSession;
}

function assertBranchAccess(user: AuthPayload, branchId: number): void {
  if (!isSuperAdmin(user.role) && user.branchId !== branchId) {
    throw new Error('ACCESS_DENIED');
  }
}

async function assertStudentLiveSessionAccess(user: AuthPayload, liveSessionId: number) {
  const record = await getStudentRecord(user);
  if (!record) throw new Error('STUDENT_RECORD_NOT_FOUND');

  const liveSession = await getLiveSessionForAccess(liveSessionId);
  assertBranchAccess(user, liveSession.batch.branchId);
  if (record.branchId !== liveSession.batch.branchId) throw new Error('ACCESS_DENIED');

  const batchStudent = await prisma.batchStudent.findFirst({
    where: {
      batchId: liveSession.batchId,
      studentId: record.studentId,
      status: 'active',
    },
    select: { id: true },
  });
  if (!batchStudent) throw new Error('BATCH_MEMBERSHIP_REQUIRED');

  return { liveSession, studentId: record.studentId };
}

async function assertTrainerLiveSessionAccess(user: AuthPayload, liveSessionId: number) {
  const liveSession = await getLiveSessionForAccess(liveSessionId);
  assertBranchAccess(user, liveSession.batch.branchId);
  await assertTeacherBatchAccess(user, liveSession.batchId);
  return liveSession;
}

export const mentorQaService = {
  createQuestion: async (
    user: AuthPayload,
    data: { liveSessionId: number; questionText: string },
  ) => {
    const { liveSession, studentId } = await assertStudentLiveSessionAccess(user, data.liveSessionId);

    const question = await prisma.mentorQuestion.create({
      data: {
        liveSessionId: liveSession.id,
        studentId,
        questionText: data.questionText,
      },
      select: MENTOR_QUESTION_SELECT,
    });

    console.log(
      `[MentorQA] Question created — id=${question.id}, liveSessionId=${liveSession.id}, studentId=${studentId}`,
    );
    return question;
  },

  listQuestions: async (user: AuthPayload, liveSessionId: number) => {
    if (user.role === ROLES.STUDENT) {
      await assertStudentLiveSessionAccess(user, liveSessionId);
    } else {
      await assertTrainerLiveSessionAccess(user, liveSessionId);
    }

    const questions = await prisma.mentorQuestion.findMany({
      where: { liveSessionId },
      orderBy: { createdAt: 'asc' },
      select: MENTOR_QUESTION_SELECT,
    });

    console.log(`[MentorQA] Questions fetched — liveSessionId=${liveSessionId}, count=${questions.length}`);
    return questions;
  },

  answerQuestion: async (
    user: AuthPayload,
    questionId: number,
    answerText: string,
  ) => {
    const question = await prisma.mentorQuestion.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        liveSessionId: true,
      },
    });
    if (!question) throw new Error('MENTOR_QUESTION_NOT_FOUND');

    await assertTrainerLiveSessionAccess(user, question.liveSessionId);

    const updated = await prisma.mentorQuestion.update({
      where: { id: questionId },
      data: {
        answerText,
        answeredByUserId: user.userId,
        answeredAt: new Date(),
      },
      select: MENTOR_QUESTION_SELECT,
    });

    console.log(`[MentorQA] Question answered — id=${questionId}, answeredBy=${user.userId}`);
    return updated;
  },
};
