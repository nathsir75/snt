import { Router } from 'express';
import { mentorQaController } from './mentorQa.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { mentorQuestionRateLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

router.post('/questions', authMiddleware, branchScope, requireRole('student'), mentorQuestionRateLimiter, mentorQaController.createQuestion as any);
router.get('/questions', authMiddleware, branchScope, requireRole('super_admin', 'branch_admin', 'teacher', 'student'), mentorQaController.listQuestions as any);
router.patch('/questions/:id/answer', authMiddleware, branchScope, requireRole('teacher'), mentorQaController.answerQuestion as any);

export default router;
