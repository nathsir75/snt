import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { dailyQuizController } from './dailyQuiz.controller';

const router = Router();

router.use(authMiddleware, branchScope);

router.get('/teacher', requireRole('super_admin', 'branch_admin', 'teacher'), dailyQuizController.teacherList as any);
router.get('/teacher/report', requireRole('super_admin', 'branch_admin', 'teacher'), dailyQuizController.teacherReport as any);
router.post('/', requireRole('super_admin', 'branch_admin', 'teacher'), dailyQuizController.create as any);
router.delete('/:id', requireRole('super_admin', 'branch_admin', 'teacher'), dailyQuizController.archive as any);

router.get('/student', requireRole('student'), dailyQuizController.studentList as any);
router.get('/student/history', requireRole('student'), dailyQuizController.studentHistory as any);
router.post('/:id/start', requireRole('student'), dailyQuizController.start as any);
router.get('/attempts/:id', requireRole('student'), dailyQuizController.getAttempt as any);
router.post('/attempts/:id/submit', requireRole('student'), dailyQuizController.submit as any);
router.get('/attempts/:id/result', requireRole('student'), dailyQuizController.result as any);

export default router;
