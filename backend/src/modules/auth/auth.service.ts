import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../db/prisma';
import { Role } from '../../common/roles';

export interface AuthUserPayload {
  id: number;
  name: string;
  email: string;
  role: Role;
  branchId: number | null;
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

export const authService = {
  login: async (email: string, password: string): Promise<LoginResult> => {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        branch: { select: { id: true, name: true, code: true, city: true, status: true } },
      },
    });

    if (!user) {
      console.log(`[Auth] Login failed — user not found: ${email}`);
      throw new Error('USER_NOT_FOUND');
    }

    if (!user.isActive || user.status !== 'active') {
      console.log(`[Auth] Login failed — inactive user: ${email}, status=${user.status}`);
      throw new Error('USER_INACTIVE');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[Auth] Login failed — invalid password for: ${email}`);
      throw new Error('INVALID_PASSWORD');
    }

    const roleName = user.role.name as Role;
    const payload  = { userId: user.id, role: roleName, branchId: user.branchId };
    const token    = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1d' });

    console.log(`[Auth] Login success — email: ${email}, role: ${roleName}`);

    const authUser: AuthUserPayload = {
      id:       user.id,
      name:     user.name,
      email:    user.email,
      role:     roleName,
      branchId: user.branchId,
      isActive: user.isActive,
      branch:   user.branch
        ? { id: user.branch.id, name: user.branch.name, code: user.branch.code, city: user.branch.city, isActive: user.branch.status === 'active' }
        : null,
    };

    return { token, user: authUser };
  },

  findById: async (userId: number) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role:   { select: { name: true } },
        branch: { select: { id: true, name: true, code: true, city: true, status: true } },
      },
    });

    if (!user) return null;

    return {
      id:       user.id,
      name:     user.name,
      email:    user.email,
      role:     user.role.name as Role,
      branchId: user.branchId,
      isActive: user.isActive,
      branch:   user.branch
        ? { id: user.branch.id, name: user.branch.name, code: user.branch.code, city: user.branch.city, isActive: user.branch.status === 'active' }
        : null,
    };
  },
};
