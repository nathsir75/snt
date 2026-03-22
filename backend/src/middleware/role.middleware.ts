import { Response, NextFunction } from 'express';
import { AuthRequest } from '../common/types';
import { Role } from '../common/roles';

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole || !roles.includes(userRole as Role)) {
      res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
      return;
    }

    next();
  };
}
