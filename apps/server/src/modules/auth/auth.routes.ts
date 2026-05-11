import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from './auth.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import { authLimiter } from '../../middleware/rate-limit.middleware.js';
import { registerSchema, loginSchema, refreshSchema } from './auth.validator.js';

const router = Router();

router.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  authController.register.bind(authController)
);

router.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  authController.login.bind(authController)
);

router.post(
  '/refresh',
  validate({ body: refreshSchema }),
  authController.refresh.bind(authController)
);

router.get(
  '/me',
  authenticate,
  authController.me.bind(authController)
);

export { router as authRoutes };
