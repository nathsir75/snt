import { Router } from 'express';
import { trainerController } from './trainer.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

const allowRead  = requireRole('super_admin', 'branch_admin');
const allowWrite = requireRole('super_admin', 'branch_admin');

router.post( '/',    authMiddleware, branchScope, allowWrite, trainerController.createTrainer as any);
router.get(  '/',    authMiddleware, branchScope, allowRead,  trainerController.getAllTrainers as any);
router.get(  '/:id', authMiddleware, branchScope, allowRead,  trainerController.getTrainerById as any);
router.patch('/:id', authMiddleware, branchScope, allowWrite, trainerController.updateTrainer as any);

export default router;
