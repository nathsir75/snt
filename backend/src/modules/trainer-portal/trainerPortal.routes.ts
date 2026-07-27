import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { trainerPortalController } from './trainerPortal.controller';

const router = Router();
const allowTrainer = requireRole('teacher');

router.get('/summary', authMiddleware, allowTrainer, trainerPortalController.getSummary as any);
router.get('/batches/:batchId/students', authMiddleware, allowTrainer, trainerPortalController.getStudentsByBatch as any);

export default router;
