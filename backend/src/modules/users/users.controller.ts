import { Request, Response } from 'express';
import { AuthRequest } from '../../common/types';
import { usersService } from './users.service';

export const usersController = {
  getAllUsers: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      console.log(`[Users] GET /api/v1/users — role: ${req.user!.role}`);
      const users = await usersService.getAllUsers(req.user!);
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

  createUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password, role, branchId } = req.body;
      console.log('[Users] CREATE REQUEST PAYLOAD:', { name, email, role, branchId });

      if (!name || !email || !password || !role) {
        res.status(400).json({ message: 'name, email, password and role are required' });
        return;
      }

      const user = await usersService.createUser({ name, email, password, role, branchId });
      res.status(201).json(user);
    } catch (error: any) {
      const errorMap: Record<string, [number, string]> = {
        INVALID_ROLE:    [400, 'Invalid role specified'],
        BRANCH_REQUIRED: [400, 'branchId is required for this role'],
        BRANCH_NOT_FOUND:[404, 'Branch not found'],
        EMAIL_TAKEN:     [409, 'A user with this email already exists'],
      };
      const [status, message] = errorMap[error.message] ?? [500, 'Failed to create user'];
      console.error(`[Users] createUser error: ${error.message}`);
      res.status(status).json({ message });
    }
  },
};
