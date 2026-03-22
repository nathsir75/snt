import { Router } from 'express';
import { usersController } from './users.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

const allowAdmin = requireRole('super_admin', 'branch_admin');

router.get('/me',      authMiddleware,                          usersController.getMe as any);
router.get('/',        authMiddleware, branchScope, allowAdmin, usersController.getAllUsers as any);
router.post('/create', authMiddleware, requireRole('super_admin'), usersController.createUser);

export default router;
