import { Router } from 'express';
import { usersController } from './users.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

const allowAdmin = requireRole('super_admin', 'branch_admin');
const superAdminOnly = requireRole('super_admin');

router.get('/me',      authMiddleware,                          usersController.getMe as any);
router.get('/',        authMiddleware, branchScope, allowAdmin, usersController.getAllUsers as any);
router.get('/trainer-link-candidates', authMiddleware, branchScope, superAdminOnly, usersController.getTrainerLinkCandidates as any);
router.post('/create', authMiddleware, superAdminOnly, usersController.createUser as any);
router.patch('/:id', authMiddleware, superAdminOnly, usersController.updateUser as any);
router.post('/:id/reset-password', authMiddleware, superAdminOnly, usersController.resetPassword as any);
router.delete('/:id', authMiddleware, superAdminOnly, usersController.deleteUser as any);

export default router;
