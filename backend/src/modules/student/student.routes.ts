import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { studentController } from './student.controller';

const router = Router();

// All routes: authenticated student only — no other role can access
router.use(authMiddleware, branchScope, requireRole('student'));

router.get(  '/me',                  studentController.getMyProfile     as any);
router.patch('/me',                  studentController.updateMyProfile  as any);
router.get(  '/me/fees',             studentController.getMyFees        as any);
router.get(  '/me/results',          studentController.getMyResults     as any);
router.get(  '/me/certificates',     studentController.getMyCertificates as any);
router.get(  '/me/placements',       studentController.getMyPlacements  as any);
router.get(  '/me/schedule',         studentController.getMySchedule    as any);
router.get(  '/me/alerts',           studentController.getMyAlerts      as any);
router.patch('/me/alerts/:id/read',  studentController.markAlertRead    as any);

export default router;
