import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { enquiryFollowUpController } from './enquiryFollowUp.controller';

const router = Router();

// counselor is the primary user of follow-ups
const allowCRM = requireRole('super_admin', 'branch_admin', 'counselor');

router.use(authMiddleware, branchScope);

// static routes first — must come before /:enquiryId
router.get('/due',     allowCRM, enquiryFollowUpController.getDue);
router.get('/summary', allowCRM, enquiryFollowUpController.getSummary);

// collection routes
router.post('/', allowCRM, enquiryFollowUpController.create);
router.get('/',  allowCRM, enquiryFollowUpController.list);

// dynamic route last
router.get('/enquiry/:enquiryId', allowCRM, enquiryFollowUpController.getByEnquiry);

export default router;
