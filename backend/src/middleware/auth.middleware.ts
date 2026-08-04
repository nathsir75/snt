import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma';
import { AuthRequest, AuthPayload } from '../common/types';

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as AuthPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { isActive: true, status: true, scope: true, branchId: true, mustChangePassword: true, passwordChangedAt: true },
    });
    if (!user || !user.isActive || user.status !== 'active') {
      res.status(401).json({ error: 'User account is not active' });
      return;
    }
    if (user.passwordChangedAt && decoded.iat && decoded.iat * 1000 < user.passwordChangedAt.getTime() - 1000) {
      res.status(401).json({ error: 'Session expired. Please sign in again.' });
      return;
    }
    const allowedWhileChangingPassword = req.originalUrl.startsWith('/api/v1/auth/me')
      || req.originalUrl.startsWith('/api/v1/auth/change-password');
    if (user.mustChangePassword && !allowedWhileChangingPassword) {
      res.status(403).json({ code: 'PASSWORD_CHANGE_REQUIRED', message: 'Password change is required before continuing' });
      return;
    }

    console.log(`[Auth] Token verified for userId: ${decoded.userId}, role: ${decoded.role}`);
    req.user = {
      ...decoded,
      scope: user.scope as 'global' | 'branch',
      branchId: user.branchId,
      mustChangePassword: user.mustChangePassword,
    };
    next();
  } catch (error) {
    console.error('[Auth] Invalid or expired token');
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
