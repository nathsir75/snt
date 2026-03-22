import { Router } from 'express';
import { discountRequestController } from './discountRequest.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

const allowAdmin = requireRole('super_admin', 'branch_admin');

// branch_admin creates discount requests; super_admin decides
router.post( '/',              authMiddleware, branchScope, allowAdmin,                  discountRequestController.createRequest as any);
router.get(  '/',              authMiddleware, branchScope, allowAdmin,                  discountRequestController.getAllRequests as any);
router.get(  '/:id',          authMiddleware, branchScope, allowAdmin,                  discountRequestController.getRequestById as any);
router.patch('/:id/decision', authMiddleware, requireRole('super_admin'),               discountRequestController.decideRequest as any);

export default router;
