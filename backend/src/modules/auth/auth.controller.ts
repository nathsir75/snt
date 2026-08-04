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
      } else if (error.message === 'USER_INACTIVE') {
        res.status(403).json({ error: 'User account is not active' });
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

  forgotPassword: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body ?? {};
      if (typeof email === 'string' && email.trim()) {
        const result = await authService.requestPasswordReset(email, req.ip, req.get('user-agent'));
        res.json({
          message: 'If an active account exists for this email, a password reset link has been sent.',
          ...(result.devResetUrl ? { devResetUrl: result.devResetUrl } : {}),
        });
        return;
      }
      res.json({ message: 'If an active account exists for this email, a password reset link has been sent.' });
    } catch (error) {
      console.error('[Auth] forgot-password error:', error);
      res.json({ message: 'If an active account exists for this email, a password reset link has been sent.' });
    }
  },

  resetPassword: async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, newPassword } = req.body ?? {};
      await authService.resetPasswordWithToken(token, newPassword);
      res.json({ message: 'Password has been reset. Please sign in with your new password.' });
    } catch (error: any) {
      const errorMap: Record<string, [number, string]> = {
        INVALID_INPUT: [400, 'Reset token and new password are required'],
        WEAK_PASSWORD: [400, 'New password must be at least 8 characters'],
        PASSWORD_REUSED: [400, 'New password must be different from the current password'],
        TOKEN_INVALID: [400, 'This reset link is invalid or expired'],
        USER_INACTIVE: [403, 'User account is not active'],
      };
      const [status, message] = errorMap[error.message] ?? [500, 'Failed to reset password'];
      if (status >= 500) console.error('[Auth] reset-password error:', error);
      res.status(status).json({ message });
    }
  },

  changePassword: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body ?? {};
      const result = await authService.changePassword(req.user!.userId, currentPassword, newPassword);
      res.json(result);
    } catch (error: any) {
      const errorMap: Record<string, [number, string]> = {
        INVALID_INPUT: [400, 'Current password and new password are required'],
        INVALID_PASSWORD: [401, 'Current password is incorrect'],
        WEAK_PASSWORD: [400, 'New password must be at least 8 characters'],
        PASSWORD_REUSED: [400, 'New password must be different from the current password'],
        USER_INACTIVE: [403, 'User account is not active'],
      };
      const [status, message] = errorMap[error.message] ?? [500, 'Failed to change password'];
      if (status >= 500) console.error('[Auth] change-password error:', error);
      res.status(status).json({ message });
    }
  },
};
