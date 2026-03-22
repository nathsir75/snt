import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { placementController } from './placement.controller';

const router = Router();
const allowBoth = requireRole('super_admin', 'branch_admin');

// Public — no auth required
router.get('/public-summary', placementController.getPublicSummary);

router.use(authMiddleware, branchScope);

// static first
router.get('/summary',  allowBoth,                  placementController.getSummary);

// collection
router.post('/',        requireRole('super_admin'),  placementController.create);
router.get('/',         allowBoth,                   placementController.list);

// dynamic last
router.get('/:id',         allowBoth,                   placementController.getById);
router.patch('/:id/status',allowBoth,                   placementController.updateStatus);

export default router;
