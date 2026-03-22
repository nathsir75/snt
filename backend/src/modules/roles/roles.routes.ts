import { Router } from 'express';
import { rolesController } from './roles.controller';

const router = Router();

router.get('/', rolesController.placeholder);

export default router;
