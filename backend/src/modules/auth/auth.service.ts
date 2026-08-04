import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../../db/prisma';
import { Role } from '../../common/roles';
import { mailService } from '../../common/services/mail.service';

export interface AuthUserPayload {
  id: number;
  name: string;
  email: string;
  role: Role;
  branchId: number | null;
  scope: 'global' | 'branch';
  mustChangePassword: boolean;
  isActive: boolean;
  branch: {
    id: number;
    name: string;
    code: string;
    city: string;
    isActive: boolean;
  } | null;
}

export interface LoginResult {
  token: string;
  user: AuthUserPayload;
}

export interface ForgotPasswordResult {
  devResetUrl?: string;
}

type AuthDbUser = {
  id: number;
  name: string;
  email: string;
  branchId: number | null;
  scope: string;
  mustChangePassword: boolean;
  isActive: boolean;
  role: { name: string };
  branch: { id: number; name: string; code: string; city: string; status: string } | null;
};

function normalizeEmail(email: string): string {
  return String(email ?? '').trim().toLowerCase();
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function buildResetUrl(token: string): string {
  const base = process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:4200';
  return `${base.replace(/\/$/, '')}/auth/reset-password?token=${encodeURIComponent(token)}`;
}

function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function fingerprint(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 10);
}

function toAuthUser(user: AuthDbUser): AuthUserPayload {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name as Role,
    branchId: user.branchId,
    scope: user.scope as 'global' | 'branch',
    mustChangePassword: user.mustChangePassword,
    isActive: user.isActive,
    branch: user.branch
      ? { id: user.branch.id, name: user.branch.name, code: user.branch.code, city: user.branch.city, isActive: user.branch.status === 'active' }
      : null,
  };
}

function signLogin(user: AuthDbUser): LoginResult {
  const token = jwt.sign({
    userId: user.id,
    role: user.role.name as Role,
    branchId: user.branchId,
    scope: user.scope as 'global' | 'branch',
    mustChangePassword: user.mustChangePassword,
  }, process.env.JWT_SECRET as string, { expiresIn: '1d' });

  return { token, user: toAuthUser(user) };
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResult> => {
    const normalizedEmail = normalizeEmail(email);
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        role: true,
        branch: { select: { id: true, name: true, code: true, city: true, status: true } },
      },
    });

    if (!user) {
      console.log(`[Auth] Login failed - user not found: ${normalizedEmail}`);
      throw new Error('USER_NOT_FOUND');
    }

    if (!user.isActive || user.status !== 'active') {
      console.log(`[Auth] Login failed - inactive user: ${normalizedEmail}, status=${user.status}`);
      throw new Error('USER_INACTIVE');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[Auth] Login failed - invalid password for: ${normalizedEmail}`);
      throw new Error('INVALID_PASSWORD');
    }

    console.log(`[Auth] Login success - email: ${normalizedEmail}, role: ${user.role.name}`);
    return signLogin(user);
  },

  findById: async (userId: number) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: { select: { name: true } },
        branch: { select: { id: true, name: true, code: true, city: true, status: true } },
      },
    });

    return user ? toAuthUser(user) : null;
  },

  changePassword: async (userId: number, currentPassword: string, nextPassword: string): Promise<LoginResult> => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        branch: { select: { id: true, name: true, code: true, city: true, status: true } },
      },
    });

    if (!user || !user.isActive || user.status !== 'active') throw new Error('USER_INACTIVE');
    if (!currentPassword || !nextPassword) throw new Error('INVALID_INPUT');
    if (nextPassword.length < 8) throw new Error('WEAK_PASSWORD');

    const currentMatches = await bcrypt.compare(currentPassword, user.password);
    if (!currentMatches) throw new Error('INVALID_PASSWORD');

    const samePassword = await bcrypt.compare(nextPassword, user.password);
    if (samePassword) throw new Error('PASSWORD_REUSED');

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(nextPassword, 10),
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
      include: {
        role: true,
        branch: { select: { id: true, name: true, code: true, city: true, status: true } },
      },
    });

    return signLogin(updated);
  },

  requestPasswordReset: async (email: string, ip?: string, userAgent?: string): Promise<ForgotPasswordResult> => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return {};

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { role: true },
    });

    if (!user || !user.isActive || user.status !== 'active') {
      console.log(`[Auth] Password reset requested for unknown or inactive account fingerprint=${fingerprint(normalizedEmail)}`);
      return {};
    }

    const now = new Date();
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now },
    });

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const resetUrl = buildResetUrl(rawToken);
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(rawToken),
        expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
        requestedIp: ip?.slice(0, 100),
        userAgent: userAgent?.slice(0, 300),
      },
    });

    try {
      await mailService.send({
        to: user.email,
        subject: 'Reset your SNT Education password',
        text: [
          `Hello ${user.name},`,
          '',
          'We received a request to reset your SNT Education LMS password.',
          'Use this secure link within 30 minutes:',
          resetUrl,
          '',
          'If you did not request this, you can ignore this email.',
        ].join('\n'),
        html: [
          `<p>Hello ${user.name},</p>`,
          '<p>We received a request to reset your SNT Education LMS password.</p>',
          `<p><a href="${resetUrl}">Reset your password</a></p>`,
          '<p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>',
        ].join(''),
      });
    } catch (error: any) {
      if (error.message === 'SMTP_NOT_CONFIGURED') {
        console.warn('[Auth] SMTP is not configured; password reset email was not sent.');
        return isProduction() ? {} : { devResetUrl: resetUrl };
      }
      console.error('[Auth] Failed to send password reset email.');
    }

    return {};
  },

  resetPasswordWithToken: async (token: string, newPassword: string): Promise<void> => {
    if (!token || !newPassword) throw new Error('INVALID_INPUT');
    if (newPassword.length < 8) throw new Error('WEAK_PASSWORD');

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(token) },
      include: { user: true },
    });

    const now = new Date();
    if (!resetToken || resetToken.usedAt || resetToken.revokedAt || resetToken.expiresAt <= now) {
      throw new Error('TOKEN_INVALID');
    }
    if (!resetToken.user.isActive || resetToken.user.status !== 'active') throw new Error('USER_INACTIVE');

    const reused = await bcrypt.compare(newPassword, resetToken.user.password);
    if (reused) throw new Error('PASSWORD_REUSED');

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: {
          password: await bcrypt.hash(newPassword, 10),
          mustChangePassword: false,
          passwordChangedAt: now,
        },
      });
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: now },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: resetToken.userId, id: { not: resetToken.id }, usedAt: null, revokedAt: null },
        data: { revokedAt: now },
      });
    });
  },
};
