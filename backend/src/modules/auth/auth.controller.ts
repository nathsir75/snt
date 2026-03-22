import { Request, Response } from 'express';
import { authService } from './auth.service';
import { AuthRequest } from '../../common/types';

export const authController = {
  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const result = await authService.login(email, password);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'USER_NOT_FOUND') {
        res.status(404).json({ error: 'User not found' });
      } else if (error.message === 'INVALID_PASSWORD') {
        res.status(401).json({ error: 'Invalid credentials' });
      } else {
        console.error('[Auth] Login error:', error);
        res.status(500).json({ error: 'Login failed' });
      }
    }
  },

  me: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await authService.findById(req.user!.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json(user);
    } catch (error) {
      console.error('[Auth] /me error:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  },
};
