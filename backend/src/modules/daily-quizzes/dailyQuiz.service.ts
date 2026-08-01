import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { ROLES } from '../../common/roles';
import { hasGlobalScope } from '../../common/utils/scope.util';
import { assertTeacherBatchAccess } from '../../common/utils/teacher-scope.util';
import { getStudentRecord } from '../../common/utils/student-scope.util';

const MIN_ATTEMPT_MINUTES = 1;
const MAX_ATTEMPT_MINUTES = 60;
const DEFAULT_ATTEMPT_MINUTES = 10;
const QUESTION_TYPES = ['mcq', 'true_false', 'ordering', 'matching'] as const;
type QuestionType = typeof QUESTION_TYPES[number];

const QUIZ_LIST_SELECT = {
  id: true,
  batchId: true,
  branchId: true,
  title: true,
  topic: true,
  lectureDate: true,
  scheduledAt: true,
  closesAt: true,
  durationMinutes: true,
  isPublished: true,
  archivedAt: true,
  createdAt: true,
  batch: { select: { id: true, name: true, branch: { select: { id: true, name: true } }, course: { select: { id: true, name: true } } } },
  _count: { select: { questions: true, attempts: true } },
};

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function asDate(value: unknown, code: string): Date {
  const date = new Date(text(value));
  if (Number.isNaN(date.getTime())) throw new Error(code);
  return date;
}

function attemptDuration(value: unknown): number {
  const minutes = Number(value ?? DEFAULT_ATTEMPT_MINUTES);
  if (!Number.isInteger(minutes) || minutes < MIN_ATTEMPT_MINUTES || minutes > MAX_ATTEMPT_MINUTES) {
    throw new Error('INVALID_ATTEMPT_DURATION');
  }
  return minutes;
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function questionType(value: unknown): QuestionType {
  const type = text(value) || 'mcq';
  if (!QUESTION_TYPES.includes(type as QuestionType)) throw new Error('INVALID_QUESTION_TYPE');
  return type as QuestionType;
}

function normalizeOptions(question: any, type: QuestionType) {
  const options = Array.isArray(question.options) ? question.options : [];
  if (type === 'true_false') {
    const correct = text(question.correctBoolean).toLowerCase();
    if (!['true', 'false'].includes(correct)) throw new Error('INVALID_QUESTION');
    return [
      { text: 'True', matchText: null, isCorrect: correct === 'true', order: 0 },
      { text: 'False', matchText: null, isCorrect: correct === 'false', order: 1 },
    ];
  }
  if (type === 'mcq') {
    if (options.length !== 4 || options.filter((option: any) => !!option.isCorrect).length !== 1) throw new Error('INVALID_QUESTION');
    return options.map((option: any, index: number) => {
      if (!text(option.text)) throw new Error('INVALID_QUESTION');
      return { text: text(option.text), matchText: null, isCorrect: !!option.isCorrect, order: index };
    });
  }
  if (type === 'ordering') {
    if (options.length < 2 || options.length > 8) throw new Error('INVALID_QUESTION');
    return options.map((option: any, index: number) => {
      if (!text(option.text)) throw new Error('INVALID_QUESTION');
      return { text: text(option.text), matchText: null, isCorrect: false, order: index };
    });
  }
  if (options.length < 2 || options.length > 8) throw new Error('INVALID_QUESTION');
  return options.map((option: any, index: number) => {
    if (!text(option.text) || !text(option.matchText)) throw new Error('INVALID_QUESTION');
    return { text: text(option.text), matchText: text(option.matchText), isCorrect: false, order: index };
  });
}

async function assertBatchAccess(user: AuthPayload, batchId: number) {
  const batch = await prisma.batch.findUnique({ where: { id: batchId }, select: { id: true, branchId: true } });
  if (!batch) throw new Error('BATCH_NOT_FOUND');
  if (!hasGlobalScope(user) && batch.branchId !== user.branchId) throw new Error('ACCESS_DENIED');
  await assertTeacherBatchAccess(user, batchId);
  return batch;
}

async function getActiveStudentBatch(user: AuthPayload, batchId: number) {
  const record = await getStudentRecord(user);
  if (!record) throw new Error('STUDENT_RECORD_NOT_FOUND');
  const enrollment = await prisma.batchStudent.findFirst({
    where: { studentId: record.studentId, batchId, status: 'active' },
    select: { id: true },
  });
  if (!enrollment) throw new Error('ACCESS_DENIED');
  return record;
}

function publicQuestion(question: any, optionIds: number[]) {
  const byId = new Map(question.options.map((option: any) => [option.id, option]));
  const orderedOptions = optionIds.map((id) => byId.get(id)).filter(Boolean);
  const authoredOptions = [...question.options].sort((a: any, b: any) => a.order - b.order);
  if (question.questionType === 'matching') {
    return {
      id: question.id,
      prompt: question.prompt,
      questionType: question.questionType,
      imageUrl: question.imageUrl,
      points: question.points,
      options: authoredOptions.map((option: any) => ({ id: option.id, text: option.text })),
      matchOptions: orderedOptions.map((option: any) => ({ id: option.id, text: option.matchText })),
    };
  }
  return {
    id: question.id,
    prompt: question.prompt,
    questionType: question.questionType,
    imageUrl: question.imageUrl,
    points: question.points,
    options: orderedOptions.map((option: any) => ({ id: option.id, text: option.text })),
  };
}

function gradeQuestion(question: any, answer: any) {
  if (question.questionType === 'ordering') {
    const submitted = Array.isArray(answer) ? answer.map(Number) : [];
    const correct = [...question.options].sort((a: any, b: any) => a.order - b.order).map((option: any) => option.id);
    return { selectedOptionId: null, answerJson: submitted, isCorrect: submitted.length === correct.length && submitted.every((id, index) => id === correct[index]) };
  }
  if (question.questionType === 'matching') {
    const submitted = answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {};
    const isCorrect = question.options.every((option: any) => Number(submitted[String(option.id)]) === option.id);
    return { selectedOptionId: null, answerJson: submitted, isCorrect };
  }
  const selectedOptionId = answer ? Number(answer) : null;
  const selected = selectedOptionId ? question.options.find((option: any) => option.id === selectedOptionId) : null;
  return { selectedOptionId, answerJson: null, isCorrect: !!selected?.isCorrect };
}

async function finalizeAttempt(attemptId: number, answers: Record<string, number | null>, submittedAt = new Date()) {
  const attempt = await prisma.dailyQuizAttempt.findUnique({
    where: { id: attemptId },
    include: { quiz: { include: { questions: { include: { options: true } } } } },
  });
  if (!attempt) throw new Error('ATTEMPT_NOT_FOUND');
  if (attempt.status !== 'in_progress') return getResult(attemptId);

  let score = 0;
  let totalPoints = 0;
  await prisma.$transaction(async (tx) => {
    for (const question of attempt.quiz.questions) {
      totalPoints += question.points;
      const graded = gradeQuestion(question, answers[String(question.id)] ?? null);
      const isCorrect = graded.isCorrect;
      const pointsAwarded = isCorrect ? question.points : 0;
      score += pointsAwarded;
      await tx.dailyQuizAnswer.upsert({
        where: { attemptId_questionId: { attemptId, questionId: question.id } },
        create: { attemptId, questionId: question.id, selectedOptionId: graded.selectedOptionId, answerJson: graded.answerJson, isCorrect, pointsAwarded },
        update: { selectedOptionId: graded.selectedOptionId, answerJson: graded.answerJson, isCorrect, pointsAwarded },
      });
    }
    await tx.dailyQuizAttempt.update({
      where: { id: attemptId },
      data: { submittedAt, status: submittedAt > attempt.expiresAt ? 'expired' : 'submitted', score, totalPoints },
    });
  });
  return getResult(attemptId);
}

async function getResult(attemptId: number) {
  const attempt = await prisma.dailyQuizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: { include: { questions: { orderBy: { order: 'asc' }, include: { options: { orderBy: { order: 'asc' } } } } } },
      answers: true,
    },
  });
  if (!attempt) throw new Error('ATTEMPT_NOT_FOUND');
  const answerByQuestion = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
  return {
    attempt: {
      id: attempt.id,
      quizId: attempt.quizId,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      submittedAt: attempt.submittedAt,
      status: attempt.status,
      score: attempt.score,
      totalPoints: attempt.totalPoints,
    },
    quiz: { id: attempt.quiz.id, title: attempt.quiz.title, topic: attempt.quiz.topic },
    questions: attempt.quiz.questions.map((question) => {
      const answer = answerByQuestion.get(question.id);
      return {
        id: question.id,
        prompt: question.prompt,
        questionType: question.questionType,
        imageUrl: question.imageUrl,
        explanation: question.explanation,
        points: question.points,
        selectedOptionId: answer?.selectedOptionId ?? null,
        answerJson: answer?.answerJson ?? null,
        isCorrect: answer?.isCorrect ?? false,
        correctOptionId: question.options.find((option) => option.isCorrect)?.id ?? null,
        correctOrderIds: question.questionType === 'ordering' ? question.options.map((option) => option.id) : null,
        correctMatches: question.questionType === 'matching' ? Object.fromEntries(question.options.map((option) => [String(option.id), option.id])) : null,
        options: question.options.map((option) => ({ id: option.id, text: option.text, matchText: option.matchText })),
      };
    }),
  };
}

async function resolveQuestionImage(user: AuthPayload, branchId: number, mediaAssetId?: number | null) {
  if (!mediaAssetId) return null;
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: mediaAssetId },
    select: { id: true, fileUrl: true, mediaType: true, branchId: true, ownerScope: true, createdByUserId: true },
  });
  if (!asset || asset.mediaType !== 'image' || !asset.fileUrl) throw new Error('QUESTION_IMAGE_NOT_FOUND');
  if (asset.ownerScope === 'branch' && asset.branchId !== branchId) throw new Error('ACCESS_DENIED');
  if (user.role === ROLES.TEACHER && asset.createdByUserId !== user.userId) throw new Error('ACCESS_DENIED');
  return asset;
}

export const dailyQuizService = {
  listForTeacher: async (user: AuthPayload) => {
    const where: any = user.role === ROLES.TEACHER
      ? { createdByUserId: user.userId }
      : hasGlobalScope(user) ? {} : { branchId: user.branchId as number };
    return prisma.dailyQuiz.findMany({ where: { ...where, archivedAt: null }, orderBy: { scheduledAt: 'desc' }, select: QUIZ_LIST_SELECT });
  },

  create: async (user: AuthPayload, data: any) => {
    const batchId = Number(data.batchId);
    const title = text(data.title);
    const scheduledAt = asDate(data.scheduledAt, 'INVALID_SCHEDULE');
    const closesAt = asDate(data.closesAt, 'INVALID_SCHEDULE');
    const questions = Array.isArray(data.questions) ? data.questions : [];
    if (!batchId || !title || questions.length < 1) throw new Error('INVALID_INPUT');
    if (closesAt <= scheduledAt) throw new Error('INVALID_WINDOW');
    const durationMinutes = attemptDuration(data.durationMinutes);
    if (questions.length > 15) throw new Error('TOO_MANY_QUESTIONS');
    const batch = await assertBatchAccess(user, batchId);

    return prisma.dailyQuiz.create({
      data: {
        batchId,
        branchId: batch.branchId,
        title,
        topic: text(data.topic) || null,
        lectureDate: text(data.lectureDate) ? asDate(data.lectureDate, 'INVALID_SCHEDULE') : null,
        scheduledAt,
        closesAt,
        durationMinutes,
        isPublished: data.isPublished ?? true,
        createdByUserId: user.userId,
        questions: {
          create: await Promise.all(questions.map(async (question: any, qIndex: number) => {
            const type = questionType(question.questionType);
            if (!text(question.prompt)) throw new Error('INVALID_QUESTION');
            const options = normalizeOptions(question, type);
            const image = await resolveQuestionImage(user, batch.branchId, question.mediaAssetId ? Number(question.mediaAssetId) : null);
            return {
              prompt: text(question.prompt),
              questionType: type,
              imageUrl: image?.fileUrl ?? null,
              mediaAssetId: image?.id ?? null,
              explanation: text(question.explanation) || null,
              points: 1,
              order: qIndex,
              options: { create: options },
            };
          })),
        },
      },
      select: QUIZ_LIST_SELECT,
    });
  },

  archive: async (user: AuthPayload, id: number) => {
    const quiz = await prisma.dailyQuiz.findUnique({ where: { id } });
    if (!quiz) throw new Error('QUIZ_NOT_FOUND');
    await assertBatchAccess(user, quiz.batchId);
    if (user.role === ROLES.TEACHER && quiz.createdByUserId !== user.userId) throw new Error('ACCESS_DENIED');
    return prisma.dailyQuiz.update({ where: { id }, data: { archivedAt: new Date(), isPublished: false }, select: QUIZ_LIST_SELECT });
  },

  listForStudent: async (user: AuthPayload) => {
    const record = await getStudentRecord(user);
    if (!record) throw new Error('STUDENT_RECORD_NOT_FOUND');
    const enrollments = await prisma.batchStudent.findMany({ where: { studentId: record.studentId, status: 'active' }, select: { batchId: true } });
    const batchIds = enrollments.map((item) => item.batchId);
    const quizzes = await prisma.dailyQuiz.findMany({
      where: { batchId: { in: batchIds }, archivedAt: null, isPublished: true },
      orderBy: { scheduledAt: 'desc' },
      select: QUIZ_LIST_SELECT,
    });
    const attempts = await prisma.dailyQuizAttempt.findMany({ where: { studentId: record.studentId, quizId: { in: quizzes.map((quiz) => quiz.id) } } });
    const attemptByQuiz = new Map(attempts.map((attempt) => [attempt.quizId, attempt]));
    return quizzes.map((quiz) => ({ ...quiz, attempt: attemptByQuiz.get(quiz.id) ?? null, serverNow: new Date() }));
  },

  start: async (user: AuthPayload, quizId: number) => {
    const quiz = await prisma.dailyQuiz.findUnique({
      where: { id: quizId },
      include: { questions: { include: { options: true } } },
    });
    if (!quiz || quiz.archivedAt || !quiz.isPublished) throw new Error('QUIZ_NOT_FOUND');
    const now = new Date();
    if (now < quiz.scheduledAt) throw new Error('QUIZ_NOT_OPEN');
    if (now >= quiz.closesAt) throw new Error('QUIZ_CLOSED');
    const record = await getActiveStudentBatch(user, quiz.batchId);
    const existing = await prisma.dailyQuizAttempt.findUnique({ where: { quizId_studentId: { quizId, studentId: record.studentId } } });
    if (existing) {
      if (existing.status === 'in_progress' && new Date() > existing.expiresAt) await finalizeAttempt(existing.id, {});
      return dailyQuizService.getAttempt(user, existing.id);
    }

    const orderedQuestions = shuffle(quiz.questions);
    const questionOrder = orderedQuestions.map((question) => question.id);
    const optionOrder: Record<string, number[]> = {};
    for (const question of orderedQuestions) {
      const options = [...question.options].sort((a, b) => a.order - b.order);
      optionOrder[String(question.id)] = question.questionType === 'mcq' || question.questionType === 'ordering' || question.questionType === 'matching'
        ? shuffle(options).map((option) => option.id)
        : options.map((option) => option.id);
    }
    const attemptDeadline = new Date(now.getTime() + quiz.durationMinutes * 60 * 1000);
    const expiresAt = attemptDeadline < quiz.closesAt ? attemptDeadline : quiz.closesAt;
    const attempt = await prisma.dailyQuizAttempt.create({
      data: { quizId, studentId: record.studentId, branchId: record.branchId, expiresAt, questionOrder, optionOrder },
    });
    return dailyQuizService.getAttempt(user, attempt.id);
  },

  getAttempt: async (user: AuthPayload, attemptId: number) => {
    const record = await getStudentRecord(user);
    if (!record) throw new Error('STUDENT_RECORD_NOT_FOUND');
    const attempt = await prisma.dailyQuizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: { include: { questions: { include: { options: true } } } } },
    });
    if (!attempt || attempt.studentId !== record.studentId) throw new Error('ATTEMPT_NOT_FOUND');
    if (attempt.status !== 'in_progress') return getResult(attempt.id);
    if (new Date() > attempt.expiresAt) return finalizeAttempt(attempt.id, {});
    const questionOrder = attempt.questionOrder as number[];
    const optionOrder = attempt.optionOrder as Record<string, number[]>;
    const byQuestion = new Map(attempt.quiz.questions.map((question) => [question.id, question]));
    return {
      attempt: { id: attempt.id, quizId: attempt.quizId, startedAt: attempt.startedAt, expiresAt: attempt.expiresAt, status: attempt.status, serverNow: new Date() },
      quiz: { id: attempt.quiz.id, title: attempt.quiz.title, topic: attempt.quiz.topic, closesAt: attempt.quiz.closesAt },
      questions: questionOrder.map((id) => byQuestion.get(id)).filter(Boolean).map((question: any) => publicQuestion(question, optionOrder[String(question.id)] ?? question.options.map((option: any) => option.id))),
    };
  },

  submit: async (user: AuthPayload, attemptId: number, answers: Record<string, number | null>) => {
    const record = await getStudentRecord(user);
    if (!record) throw new Error('STUDENT_RECORD_NOT_FOUND');
    const attempt = await prisma.dailyQuizAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.studentId !== record.studentId) throw new Error('ATTEMPT_NOT_FOUND');
    const submittedAt = new Date();
    return finalizeAttempt(attemptId, submittedAt > attempt.expiresAt ? {} : answers, submittedAt);
  },

  result: async (user: AuthPayload, attemptId: number) => {
    const record = await getStudentRecord(user);
    if (!record) throw new Error('STUDENT_RECORD_NOT_FOUND');
    const attempt = await prisma.dailyQuizAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.studentId !== record.studentId) throw new Error('ATTEMPT_NOT_FOUND');
    if (attempt.status === 'in_progress' && new Date() > attempt.expiresAt) return finalizeAttempt(attemptId, {});
    if (attempt.status === 'in_progress') throw new Error('ATTEMPT_IN_PROGRESS');
    return getResult(attemptId);
  },
};
