import { Router } from 'express';
import { branchesController } from './branches.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

// Public routes — no auth
// specific paths MUST come before param routes to avoid collision
router.get('/public',           branchesController.listPublic          as any);
router.get('/by-code/:code/public', branchesController.getPublicMetaByCode as any);
router.get('/by-code/:code',        branchesController.getByCode            as any);
router.get('/:branchId/public',     branchesController.getPublicMeta        as any);

// Authenticated routes — static paths MUST come before param routes
router.get( '/me',  authMiddleware,                                             branchesController.getMyBranch as any);
router.get( '/',    authMiddleware, requireRole('super_admin'),                 branchesController.listAll     as any);
router.post('/',    authMiddleware, requireRole('super_admin'),                 branchesController.create      as any);
router.get( '/:id', authMiddleware, requireRole('super_admin', 'branch_admin'), branchesController.getById            as any);
router.patch('/:id',authMiddleware, requireRole('super_admin'),                 branchesController.update              as any);
router.patch('/:id/public-settings', authMiddleware, requireRole('super_admin'), branchesController.updatePublicSettings as any);

export default router;
