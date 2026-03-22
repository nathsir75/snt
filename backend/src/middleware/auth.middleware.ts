import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, AuthPayload } from '../common/types';

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as AuthPayload;
    console.log(`[Auth] Token verified for userId: ${decoded.userId}, role: ${decoded.role}`);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('[Auth] Invalid or expired token');
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
