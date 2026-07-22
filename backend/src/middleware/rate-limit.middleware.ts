import { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { AuthRequest } from '../common/types';

function authenticatedUserKey(req: Request): string {
  const userId = (req as AuthRequest).user?.userId;
  if (userId) return `user:${userId}`;
  return ipKeyGenerator(req.ip ?? 'unknown');
}

export const heartbeatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authenticatedUserKey,
  message: { message: 'Too many heartbeat requests. Please wait a moment.' },
});

export const mentorQuestionRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authenticatedUserKey,
  message: { message: 'Too many questions submitted. Please wait a moment.' },
});
