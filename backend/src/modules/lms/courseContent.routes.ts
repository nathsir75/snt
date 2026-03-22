import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { lmsController } from './courseContent.controller';

const router = Router();

router.use(authMiddleware, branchScope);

// ── super_admin write operations ──────────────────────────────────────────────
router.post(  '/course-content',              requireRole('super_admin'), lmsController.createCourseContent);
router.post(  '/session',                     requireRole('super_admin'), lmsController.addSession);
router.post(  '/content-item',                requireRole('super_admin'), lmsController.addContentItem);
router.patch( '/course-content/:id/publish',  requireRole('super_admin'), lmsController.publishCourseContent);
router.patch( '/content-item/:id',            requireRole('super_admin'), lmsController.updateContentItem);
router.delete('/content-item/:id',            requireRole('super_admin'), lmsController.deleteContentItem);

// ── read operations — admin + teacher (teacher scoped) + student (student scoped to enrolled course) ──
router.get('/course-content/:courseId', requireRole('super_admin', 'branch_admin', 'teacher', 'student'), lmsController.getCourseContent);
router.get('/session/:id',              requireRole('super_admin', 'branch_admin', 'teacher', 'student'), lmsController.getSession);

export default router;
