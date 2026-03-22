import { Router } from 'express';
import { courseController } from './course.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

router.post( '/',     authMiddleware, requireRole('super_admin'),                 courseController.createCourse);
router.get(  '/',     authMiddleware, requireRole('super_admin', 'branch_admin'),  courseController.getAllCourses as any);
router.get(  '/:id',  authMiddleware, requireRole('super_admin', 'branch_admin'),  courseController.getCourseById as any);
router.patch('/:id',  authMiddleware, requireRole('super_admin'),                 courseController.updateCourse);

export default router;
