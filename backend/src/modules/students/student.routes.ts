import { Router } from 'express';
import { studentController } from './student.controller';
import { studentImportController, studentImportUpload } from './studentImport.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

// Static routes first — must come before /:id to avoid conflicts
router.get(  '/me/branch-summary',          authMiddleware, requireRole('super_admin', 'branch_admin'),                                          studentController.getBranchSummary as any);
router.post( '/import/preview',             authMiddleware, requireRole('super_admin'), studentImportUpload.single('file'),                       studentImportController.preview as any);
router.post( '/import/commit',              authMiddleware, requireRole('super_admin'), studentImportUpload.single('file'),                       studentImportController.commit as any);
router.post( '/',                           authMiddleware, requireRole('super_admin'),                                                          studentController.createManual);
router.get(  '/',                           authMiddleware, requireRole('super_admin', 'branch_admin', 'counselor'), branchScope,                 studentController.getAllStudents as any);
router.post( '/from-enquiry/:enquiryId',    authMiddleware, requireRole('super_admin', 'branch_admin', 'counselor'), branchScope,                 studentController.convertFromEnquiry as any);
router.get(  '/:id',                        authMiddleware, requireRole('super_admin', 'branch_admin', 'counselor'), branchScope,                 studentController.getStudentById as any);

export default router;
