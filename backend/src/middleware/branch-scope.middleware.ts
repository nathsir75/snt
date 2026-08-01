import { Response, NextFunction } from 'express';
import { AuthRequest } from '../common/types';
import { hasGlobalScope, isBranchScoped } from '../common/utils/scope.util';

export function branchScope(req: AuthRequest, res: Response, next: NextFunction): void {
  const user = req.user;

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (hasGlobalScope(user)) {
    console.log(`[BranchScope] global access — role=${user.role}, scope=${user.scope ?? 'legacy'}`);
    next();
    return;
  }

  if (isBranchScoped(user.role) && (user.branchId === null || user.branchId === undefined)) {
    console.warn(`[BranchScope] Blocked — role: ${user.role} has no branchId in token`);
    res.status(403).json({ error: 'Access denied. No branch assigned to this user.' });
    return;
  }

  console.log(`[BranchScope] Branch-scoped access — role: ${user.role}, branchId: ${user.branchId}`);
  next();
}
