import { Router } from 'express';
import { authController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

type Hit = { count: number; resetAt: number };
const requestHits = new Map<string, Hit>();
const resetHits = new Map<string, Hit>();

function throttle(store: Map<string, Hit>, limit: number, windowMs: number, keyer: (req: any) => string) {
  return (req: any, res: any, next: any) => {
    const now = Date.now();
    const key = keyer(req);
    const hit = store.get(key);
    if (!hit || hit.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (hit.count >= limit) {
      res.status(429).json({ message: 'Too many attempts. Please try again later.' });
      return;
    }
    hit.count += 1;
    next();
  };
}

const forgotPasswordThrottle = throttle(
  requestHits,
  5,
  15 * 60 * 1000,
  (req) => `${req.ip}:${String(req.body?.email ?? '').trim().toLowerCase()}`,
);
const resetPasswordThrottle = throttle(resetHits, 10, 15 * 60 * 1000, (req) => req.ip);

router.post('/login', authController.login);
router.post('/forgot-password', forgotPasswordThrottle, authController.forgotPassword);
router.post('/reset-password', resetPasswordThrottle, authController.resetPassword);
router.get('/me', authMiddleware, authController.me as any);
router.post('/change-password', authMiddleware, authController.changePassword as any);

export default router;
