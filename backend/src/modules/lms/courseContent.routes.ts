import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { lmsController } from './courseContent.controller';

const router = Router();

router.use(authMiddleware, branchScope);

// ── content management operations ─────────────────────────────────────────────
router.post(  '/course-content',              requireRole('super_admin', 'branch_admin', 'teacher'), lmsController.createCourseContent);
router.post(  '/session',                     requireRole('super_admin', 'branch_admin', 'teacher'), lmsController.addSession);
router.post(  '/content-item',                requireRole('super_admin', 'branch_admin', 'teacher'), lmsController.addContentItem);
router.patch( '/course-content/:id/publish',  requireRole('super_admin', 'branch_admin', 'teacher'), lmsController.publishCourseContent);
router.patch( '/content-item/:id',            requireRole('super_admin', 'branch_admin', 'teacher'), lmsController.updateContentItem);
router.delete('/content-item/:id',            requireRole('super_admin', 'branch_admin', 'teacher'), lmsController.deleteContentItem);

// ── read operations — admin + teacher (teacher scoped) + student (student scoped to enrolled course) ──
router.get('/course-content/:courseId', requireRole('super_admin', 'branch_admin', 'teacher', 'student'), lmsController.getCourseContent);
router.get('/session/:id',              requireRole('super_admin', 'branch_admin', 'teacher', 'student'), lmsController.getSession);
router.get('/content-items/:id/secure-view', requireRole('super_admin', 'branch_admin', 'teacher', 'student'), lmsController.getSecureContentItemView);

export default router;
