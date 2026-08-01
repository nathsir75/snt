import bcrypt from 'bcrypt';
import crypto from 'crypto';
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
const GLOBAL_ALLOWED_ROLES = new Set(['super_admin', 'branch_admin', 'counselor']);
const MIN_PASSWORD_LENGTH = 8;

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

async function syncTeacherAssignmentsFromTrainer(userId: number, email: string, roleName: string, branchId: number | null | undefined) {
  if (roleName !== 'teacher' || !branchId) return;

  const trainer = await prisma.trainer.findUnique({
    where: { email: normalizeEmail(email) },
    include: { batchTrainers: { select: { batchId: true, batch: { select: { branchId: true } } } } },
  });
  if (!trainer) return;

  const batchIds = trainer.batchTrainers
    .filter((assignment) => assignment.batch.branchId === branchId)
    .map((assignment) => assignment.batchId);

  await Promise.all(batchIds.map((batchId) => prisma.teacherBatchAssignment.upsert({
    where: { userId_batchId: { userId, batchId } },
    create: { userId, batchId, branchId },
    update: { branchId },
  })));
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

    return prisma.user.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      select: USER_SELECT,
    });
  },

  getUserById: async (userId: number) => {
    return prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });
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
    return { user, initialPassword: data.password ? undefined : password };
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

    const user = await prisma.user.update({
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

    await syncTeacherAssignmentsFromTrainer(user.id, user.email, roleName, scope === 'global' ? null : branchId);
    return user;
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
