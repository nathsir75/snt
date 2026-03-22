import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { reportController } from './report.controller';

const router = Router();

router.use(authMiddleware, branchScope);

// branch_admin only
router.get('/branch-dashboard',   requireRole('branch_admin'), reportController.getBranchDashboard);

// super_admin only
router.get('/overall-dashboard',  requireRole('super_admin'),  reportController.getOverallDashboard);
router.get('/student-lifecycle',  requireRole('super_admin'),  reportController.getStudentLifecycle);
router.get('/enquiries/funnel',   requireRole('super_admin'),  reportController.getEnquiryFunnel);

// both roles (branch scoping enforced inside service)
router.get('/attendance/batch/:batchId', requireRole('super_admin', 'branch_admin'), reportController.getAttendanceReport);
router.get('/fees/collection',           requireRole('super_admin', 'branch_admin'), reportController.getFeeCollectionReport);

export default router;
