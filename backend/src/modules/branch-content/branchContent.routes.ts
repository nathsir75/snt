import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { branchContentController } from './branchContent.controller';

const router = Router();

// ── Public routes — no auth ───────────────────────────────────────────────────
router.get('/public/:branchCode/:type', branchContentController.listPublic as any);

// ── Authenticated routes ──────────────────────────────────────────────────────
router.use(authMiddleware, branchScope);

const allowAdmin = requireRole('super_admin', 'branch_admin');

router.get( '/',    allowAdmin, branchContentController.list    as any);
router.get( '/:id', allowAdmin, branchContentController.getById as any);
router.post('/',    allowAdmin, branchContentController.create  as any);
router.patch('/:id',allowAdmin, branchContentController.update  as any);
router.delete('/:id',allowAdmin,branchContentController.delete  as any);

export default router;
