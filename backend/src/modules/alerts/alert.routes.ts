import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { alertController } from './alert.controller';

const router = Router();
const allowAdmin = requireRole('super_admin', 'branch_admin');
const allowRead  = requireRole('super_admin', 'branch_admin', 'counselor', 'teacher');

router.use(authMiddleware, branchScope);

// static routes — must come before /:id
router.get( '/unread-count',            allowRead,                    alertController.getUnreadCount);
router.get( '/summary',                 allowAdmin,                   alertController.getSummary);
router.post('/generate/followup-due',   requireRole('super_admin'),   alertController.generateFollowUpDueAlerts);
router.post('/generate/fee-due',        requireRole('super_admin'),   alertController.generateFeeDueAlerts);

// collection
router.get('/', allowRead, alertController.list);

// dynamic — last
router.patch('/:id/read', allowRead, alertController.markRead);

export default router;
