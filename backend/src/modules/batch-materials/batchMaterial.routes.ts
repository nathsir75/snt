import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { branchScope } from '../../middleware/branch-scope.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { batchMaterialController } from './batchMaterial.controller';

const router = Router();

router.use(authMiddleware, branchScope);

router.get('/mine', requireRole('super_admin', 'branch_admin', 'teacher'), batchMaterialController.listMine as any);
router.get('/batch/:batchId', requireRole('super_admin', 'branch_admin', 'counselor', 'teacher', 'student'), batchMaterialController.listByBatch as any);
router.post('/', requireRole('super_admin', 'branch_admin', 'teacher'), batchMaterialController.create as any);
router.patch('/:id', requireRole('super_admin', 'branch_admin', 'teacher'), batchMaterialController.update as any);
router.patch('/:id/publish', requireRole('super_admin', 'branch_admin', 'teacher'), batchMaterialController.setPublished as any);
router.delete('/:id', requireRole('super_admin', 'branch_admin', 'teacher'), batchMaterialController.archive as any);

export default router;
