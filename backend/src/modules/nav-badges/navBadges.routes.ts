import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { navBadgesController } from './navBadges.controller';

const router = Router();

// All staff roles that have a sidebar can call this
router.get(
  '/',
  authMiddleware,
  requireRole('super_admin', 'branch_admin', 'counselor', 'teacher'),
  navBadgesController.getCounts as any,
);

export default router;
