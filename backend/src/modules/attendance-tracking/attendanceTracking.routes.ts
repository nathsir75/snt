import { Router } from 'express';
import { attendanceTrackingController } from './attendanceTracking.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { heartbeatRateLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();
const allowTrainerOrAdmin = requireRole('super_admin', 'branch_admin', 'teacher');

router.post('/heartbeat', authMiddleware, branchScope, requireRole('student'), heartbeatRateLimiter, attendanceTrackingController.heartbeat as any);
router.get('/my/live-session/:liveSessionId', authMiddleware, branchScope, requireRole('student'), attendanceTrackingController.getMySessionAttendance as any);
router.get('/live-session/:liveSessionId', authMiddleware, branchScope, allowTrainerOrAdmin, attendanceTrackingController.getSessionAttendance as any);

export default router;
