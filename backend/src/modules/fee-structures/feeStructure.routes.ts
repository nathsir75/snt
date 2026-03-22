import { Router } from 'express';
import { feeStructureController } from './feeStructure.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

router.post( '/',                    authMiddleware, requireRole('super_admin'),                feeStructureController.createFeeStructure);
router.get(  '/',                    authMiddleware, requireRole('super_admin', 'branch_admin'), feeStructureController.getAllFeeStructures as any);
router.get(  '/course/:courseId',    authMiddleware, requireRole('super_admin', 'branch_admin'), feeStructureController.getFeeStructuresByCourse as any);
router.patch('/:id',                 authMiddleware, requireRole('super_admin'),                feeStructureController.updateFeeStructure);

export default router;
