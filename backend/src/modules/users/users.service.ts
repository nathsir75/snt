import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { getBranchFilter, hasGlobalScope } from '../../common/utils/scope.util';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  scope: true,
  isActive: true,
  status: true,
  archivedAt: true,
  suspendedAt: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { name: true } },
  branch: { select: { id: true, name: true, city: true } },
};

const VALID_STATUSES = new Set(['active', 'suspended', 'archived']);
const VALID_SCOPES = new Set(['global', 'branch']);
const GLOBAL_ALLOWED_ROLES = new Set(['super_admin', 'branch_admin', 'counselor', 'teacher']);
const MIN_PASSWORD_LENGTH = 8;
type DbClient = typeof prisma | Prisma.TransactionClient;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function cleanText(value: unknown): string {
  return String(value ?? '').trim();
}

function generatePassword(): string {
  return `Snt@${crypto.randomBytes(6).toString('base64url')}`;
}

function statusFlags(status: string) {
  return {
    status,
    isActive: status === 'active',
    suspendedAt: status === 'suspended' ? new Date() : null,
    archivedAt: status === 'archived' ? new Date() : null,
  };
}

function normalizeScope(roleName: string, scope?: string, branchId?: number | null): 'global' | 'branch' {
  if (scope !== undefined && !VALID_SCOPES.has(scope)) throw new Error('INVALID_SCOPE');
  if (roleName === 'super_admin') return 'global';
  if (scope === 'global') return 'global';
  return branchId ? 'branch' : 'branch';
}

async function validateRoleBranchAndScope(roleName: string, branchId?: number | null, rawScope?: string) {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) throw new Error('INVALID_ROLE');

  const scope = normalizeScope(roleName, rawScope, branchId);

  if (scope === 'global' && !GLOBAL_ALLOWED_ROLES.has(roleName)) throw new Error('GLOBAL_SCOPE_FORBIDDEN');
  if (scope === 'branch' && !branchId) throw new Error('BRANCH_REQUIRED');

  if (branchId && scope === 'branch') {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new Error('BRANCH_NOT_FOUND');
  }

  return { role, scope };
}

async function syncTeacherAssignmentsFromTrainer(
  userId: number,
  email: string,
  roleName: string,
  branchId: number | null | undefined,
  db: DbClient = prisma,
) {
  if (roleName !== 'teacher') return;

  const trainer = await db.trainer.findUnique({
    where: { email: normalizeEmail(email) },
    include: { batchTrainers: { select: { batchId: true, batch: { select: { branchId: true } } } } },
  });
  if (!trainer) return;

  const batchIds = trainer.batchTrainers
    .filter((assignment) => branchId == null || assignment.batch.branchId === branchId)
    .map((assignment) => assignment.batchId);

  await Promise.all(batchIds.map((batchId) => db.teacherBatchAssignment.upsert({
    where: { userId_batchId: { userId, batchId } },
    create: { userId, batchId, branchId: trainer.branchId },
    update: { branchId: trainer.branchId },
  })));
}

async function attachTeacherLinks<T extends Array<any>>(users: T): Promise<T> {
  const teacherUsers = users.filter((user) => {
    const roleName = typeof user.role === 'string' ? user.role : user.role?.name;
    return roleName === 'teacher';
  });
  const emails = teacherUsers.map((user) => user.email).filter(Boolean);
  if (!emails.length) return users;

  const trainers = await prisma.trainer.findMany({
    where: { email: { in: emails } },
    select: {
      id: true,
      fullName: true,
      email: true,
      branch: { select: { id: true, name: true, city: true } },
      batchTrainers: { select: { id: true } },
    },
  });
  const byEmail = new Map(trainers.map((trainer) => [normalizeEmail(trainer.email ?? ''), trainer]));

  return users.map((user) => {
    const roleName = typeof user.role === 'string' ? user.role : user.role?.name;
    if (roleName !== 'teacher') return user;
    const trainer = byEmail.get(normalizeEmail(user.email));
    return {
      ...user,
      trainerLink: trainer ? {
        id: trainer.id,
        fullName: trainer.fullName,
        email: trainer.email,
        branch: trainer.branch,
        batchCount: trainer.batchTrainers.length,
      } : null,
    };
  }) as T;
}

async function syncLinkedTrainerEmail(
  tx: Prisma.TransactionClient,
  existingUser: { email: string; role: { name: string } },
  nextEmail: string,
) {
  if (existingUser.role.name !== 'teacher' || nextEmail === existingUser.email) return;

  const linkedTrainer = await tx.trainer.findUnique({ where: { email: existingUser.email } });
  if (!linkedTrainer) return;

  const duplicateTrainer = await tx.trainer.findUnique({ where: { email: nextEmail } });
  if (duplicateTrainer && duplicateTrainer.id !== linkedTrainer.id) throw new Error('TRAINER_EMAIL_TAKEN');

  await tx.trainer.update({
    where: { id: linkedTrainer.id },
    data: { email: nextEmail },
  });
}

async function userHasLinkedRecords(userId: number): Promise<boolean> {
  const counts = await Promise.all([
    prisma.feePayment.count({ where: { collectedByUserId: userId } }),
    prisma.discountRequest.count({ where: { requestedByUserId: userId } }),
    prisma.discountRequest.count({ where: { decidedByUserId: userId } }),
    prisma.attendance.count({ where: { markedByUserId: userId } }),
    prisma.enquiryFollowUp.count({ where: { createdByUserId: userId } }),
    prisma.alert.count({ where: { userId } }),
    prisma.examEligibilityRequest.count({ where: { requestedByUserId: userId } }),
    prisma.examEligibilityRequest.count({ where: { decidedByUserId: userId } }),
    prisma.finalExamResult.count({ where: { publishedByUserId: userId } }),
    prisma.certificateIssue.count({ where: { issuedByUserId: userId } }),
    prisma.mediaAsset.count({ where: { createdByUserId: userId } }),
    prisma.teacherBatchAssignment.count({ where: { userId } }),
    prisma.student.count({ where: { userId } }),
  ]);
  return counts.some((count) => count > 0);
}

export const usersService = {
  getAllUsers: async (user: AuthPayload, filters?: { search?: string; role?: string; status?: string; branchId?: number }) => {
    const filter: any = { ...getBranchFilter(user) };
    if (filters?.branchId && hasGlobalScope(user)) filter.branchId = filters.branchId;
    if (filters?.role) filter.role = { name: filters.role };
    if (filters?.status && VALID_STATUSES.has(filters.status)) filter.status = filters.status;
    if (filters?.search) {
      filter.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      select: USER_SELECT,
    });
    return attachTeacherLinks(users);
  },

  getUserById: async (userId: number) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });
    if (!user) return null;
    const [decorated] = await attachTeacherLinks([user]);
    return decorated;
  },

  getTrainerLinkCandidates: async (user: AuthPayload) => {
    const filter = getBranchFilter(user);
    const trainers = await prisma.trainer.findMany({
      where: { ...filter, email: { not: null } },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        branch: { select: { id: true, name: true, city: true } },
        batchTrainers: { select: { id: true } },
      },
    });
    if (!trainers.length) return [];

    const trainerEmails = trainers.map((trainer) => trainer.email).filter((email): email is string => !!email);
    const users = await prisma.user.findMany({
      where: { email: { in: trainerEmails } },
      select: { id: true, name: true, email: true, role: { select: { name: true } } },
    });
    const userByEmail = new Map(users.map((candidate) => [normalizeEmail(candidate.email), candidate]));

    return trainers.map((trainer) => ({
      id: trainer.id,
      fullName: trainer.fullName,
      email: trainer.email,
      isActive: trainer.isActive,
      branch: trainer.branch,
      batchCount: trainer.batchTrainers.length,
      linkedUser: trainer.email ? userByEmail.get(normalizeEmail(trainer.email)) ?? null : null,
    }));
  },

  createUser: async (data: {
    name: string;
    email: string;
    password?: string;
    role: string;
    branchId?: number | null;
    scope?: string;
  }) => {
    const name = cleanText(data.name);
    const email = normalizeEmail(data.email);
    const password = data.password?.trim() || generatePassword();
    if (!name || !email) throw new Error('INVALID_INPUT');
    if (password.length < MIN_PASSWORD_LENGTH) throw new Error('WEAK_PASSWORD');

    const { role, scope } = await validateRoleBranchAndScope(data.role, data.branchId, data.scope);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error('EMAIL_TAKEN');

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: role.id,
        scope,
        branchId: scope === 'global' ? null : data.branchId ?? null,
        ...statusFlags('active'),
      },
      select: USER_SELECT,
    });

    await syncTeacherAssignmentsFromTrainer(user.id, email, data.role, scope === 'global' ? null : data.branchId);
    const [decorated] = await attachTeacherLinks([user]);
    return { user: decorated, initialPassword: data.password ? undefined : password };
  },

  updateUser: async (id: number, data: {
    name?: string;
    email?: string;
    role?: string;
    branchId?: number | null;
    scope?: string;
    status?: string;
  }) => {
    const existing = await prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!existing) throw new Error('USER_NOT_FOUND');

    const roleName = data.role ?? existing.role.name;
    const branchId = data.branchId !== undefined ? data.branchId : existing.branchId;
    const { role, scope } = await validateRoleBranchAndScope(roleName, branchId, data.scope ?? existing.scope);
    const nextEmail = data.email !== undefined ? normalizeEmail(data.email) : existing.email;

    if (nextEmail !== existing.email) {
      const duplicate = await prisma.user.findUnique({ where: { email: nextEmail } });
      if (duplicate) throw new Error('EMAIL_TAKEN');
    }
    if (data.status !== undefined && !VALID_STATUSES.has(data.status)) throw new Error('INVALID_STATUS');

    const user = await prisma.$transaction(async (tx) => {
      await syncLinkedTrainerEmail(tx, existing, nextEmail);

      const updated = await tx.user.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: cleanText(data.name) }),
          ...(data.email !== undefined && { email: nextEmail }),
          ...(data.role !== undefined && { roleId: role.id }),
          scope,
          branchId: scope === 'global' ? null : branchId,
          ...(data.status !== undefined && statusFlags(data.status)),
        },
        select: USER_SELECT,
      });

      await syncTeacherAssignmentsFromTrainer(updated.id, updated.email, roleName, scope === 'global' ? null : branchId, tx);
      return updated;
    });

    const [decorated] = await attachTeacherLinks([user]);
    return decorated;
  },

  resetPassword: async (id: number, password?: string) => {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new Error('USER_NOT_FOUND');

    const nextPassword = password?.trim() || generatePassword();
    if (nextPassword.length < MIN_PASSWORD_LENGTH) throw new Error('WEAK_PASSWORD');

    const user = await prisma.user.update({
      where: { id },
      data: { password: await bcrypt.hash(nextPassword, 10) },
      select: USER_SELECT,
    });

    return { user, temporaryPassword: nextPassword };
  },

  deleteOrArchiveUser: async (id: number, actor: AuthPayload) => {
    if (id === actor.userId) throw new Error('CANNOT_DELETE_SELF');

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new Error('USER_NOT_FOUND');

    if (await userHasLinkedRecords(id)) {
      const user = await prisma.user.update({
        where: { id },
        data: statusFlags('archived'),
        select: USER_SELECT,
      });
      return { mode: 'archived', user };
    }

    await prisma.user.delete({ where: { id } });
    return { mode: 'deleted' };
  },
};
