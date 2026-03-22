import bcrypt from 'bcrypt';
import prisma from '../../db/prisma';
import { AuthPayload } from '../../common/types';
import { getBranchFilter, isSuperAdmin } from '../../common/utils/scope.util';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  role: { select: { name: true } },
  branch: { select: { id: true, name: true, city: true } },
};

export const usersService = {
  getAllUsers: async (user: AuthPayload) => {
    const filter = getBranchFilter(user);
    console.log(`[UsersService] Fetching users with filter:`, filter);
    return prisma.user.findMany({
      where: filter,
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
    password: string;
    role: string;
    branchId?: number | null;
  }) => {
    const role = await prisma.role.findUnique({ where: { name: data.role } });
    if (!role) throw new Error('INVALID_ROLE');

    if (!isSuperAdmin(data.role) && !data.branchId) {
      throw new Error('BRANCH_REQUIRED');
    }

    if (data.branchId) {
      const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
      if (!branch) throw new Error('BRANCH_NOT_FOUND');
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error('EMAIL_TAKEN');

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        roleId: role.id,
        branchId: data.branchId ?? null,
      },
      select: USER_SELECT,
    });

    console.log(`[UsersService] User created: ${user.email}`);
    return user;
  },
};
