import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { loginController } from '../controllers/auth.controller.js';

const router: ExpressRouter = Router();

router.post('/login', loginController);

export default router;