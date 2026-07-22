import { Router } from 'express';
import { liveSessionController } from './liveSession.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();
const allowTrainerOrAdmin = requireRole('super_admin', 'branch_admin', 'teacher');

router.post('/', authMiddleware, branchScope, allowTrainerOrAdmin, liveSessionController.createLiveSession as any);
router.get('/batch/:batchId', authMiddleware, branchScope, allowTrainerOrAdmin, liveSessionController.getByBatch as any);
router.get('/student/my', authMiddleware, branchScope, requireRole('student'), liveSessionController.getStudentSessions as any);
router.get('/:id', authMiddleware, branchScope, allowTrainerOrAdmin, liveSessionController.getById as any);

export default router;
