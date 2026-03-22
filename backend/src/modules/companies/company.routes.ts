import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { companyController } from './company.controller';

const router = Router();
const allowBoth = requireRole('super_admin', 'branch_admin');

router.use(authMiddleware, branchScope);

router.post('/',     requireRole('super_admin'), companyController.create);
router.get('/',      allowBoth,                  companyController.list);
router.get('/:id',   allowBoth,                  companyController.getById);

export default router;
