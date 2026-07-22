import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { lmsController } from './courseContent.controller';

const router = Router();

router.get('/:id/secure-view', authMiddleware, branchScope, requireRole('super_admin', 'branch_admin', 'teacher', 'student'), lmsController.getSecureContentItemView);

export default router;
