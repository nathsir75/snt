import { Response } from 'express';
import { AuthRequest } from '../../common/types';
import { usersService } from './users.service';

function parseOptionalInt(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export const usersController = {
  getAllUsers: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      console.log(`[Users] GET /api/v1/users — role: ${req.user!.role}`);
      const users = await usersService.getAllUsers(req.user!, {
        search: typeof req.query.search === 'string' ? req.query.search.trim() : undefined,
        role: typeof req.query.role === 'string' ? req.query.role : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        branchId: parseOptionalInt(req.query.branchId),
      });
      res.json(users);
    } catch (error) {
      console.error('[Users] Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  },

  getMe: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      console.log(`[Users] GET /api/v1/users/me — userId: ${req.user!.userId}`);
      const user = await usersService.getUserById(req.user!.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json(user);
    } catch (error) {
      console.error('[Users] Error fetching profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  },

  createUser: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, email, password, role, branchId, scope } = req.body;
      console.log('[Users] CREATE REQUEST PAYLOAD:', { name, email, role, branchId, scope });

      if (!name || !email || !role) {
        res.status(400).json({ message: 'name, email and role are required' });
        return;
      }

      const result = await usersService.createUser({ name, email, password, role, branchId, scope });
      res.status(201).json(result);
    } catch (error: any) {
      const [status, message] = mapUserError(error.message, 'Failed to create user');
      console.error(`[Users] createUser error: ${error.message}`);
      res.status(status).json({ message });
    }
  },

  getTrainerLinkCandidates: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.json(await usersService.getTrainerLinkCandidates(req.user!));
    } catch (error) {
      console.error('[Users] Error fetching trainer link candidates:', error);
      res.status(500).json({ error: 'Failed to fetch trainer link candidates' });
    }
  },

  updateUser: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        res.status(400).json({ message: 'Invalid user id' });
        return;
      }

      const user = await usersService.updateUser(id, req.body);
      res.json(user);
    } catch (error: any) {
      const [status, message] = mapUserError(error.message, 'Failed to update user');
      console.error(`[Users] updateUser error: ${error.message}`);
      res.status(status).json({ message });
    }
  },

  resetPassword: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        res.status(400).json({ message: 'Invalid user id' });
        return;
      }

      const result = await usersService.resetPassword(id, req.body?.password);
      res.json(result);
    } catch (error: any) {
      const [status, message] = mapUserError(error.message, 'Failed to reset password');
      console.error(`[Users] resetPassword error: ${error.message}`);
      res.status(status).json({ message });
    }
  },

  deleteUser: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        res.status(400).json({ message: 'Invalid user id' });
        return;
      }

      const result = await usersService.deleteOrArchiveUser(id, req.user!);
      res.json(result);
    } catch (error: any) {
      const [status, message] = mapUserError(error.message, 'Failed to delete user');
      console.error(`[Users] deleteUser error: ${error.message}`);
      res.status(status).json({ message });
    }
  },
};

function mapUserError(code: string, fallback: string): [number, string] {
  const errorMap: Record<string, [number, string]> = {
    INVALID_INPUT:       [400, 'Please provide valid user details'],
    INVALID_ROLE:        [400, 'Invalid role specified'],
    INVALID_STATUS:      [400, 'Invalid user status'],
    WEAK_PASSWORD:       [400, 'Password must be at least 8 characters'],
    INVALID_SCOPE:       [400, 'Invalid user scope'],
    GLOBAL_SCOPE_FORBIDDEN: [400, 'Global scope is only allowed for Head Office staff roles and teachers'],
    BRANCH_REQUIRED:     [400, 'branchId is required for this role'],
    BRANCH_NOT_FOUND:    [404, 'Branch not found'],
    USER_NOT_FOUND:      [404, 'User not found'],
    EMAIL_TAKEN:         [409, 'A user with this email already exists'],
    TRAINER_EMAIL_TAKEN: [409, 'Another trainer already uses this email'],
    CANNOT_DELETE_SELF:  [400, 'You cannot delete or archive your own account'],
  };
  return errorMap[code] ?? [500, fallback];
}
