import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { auth } from '../../middlewares/auth.js';
import { loginSchema, refreshSchema } from './auth.schemas.js';
import * as authService from './auth.service.js';
import { unauthenticated } from '../../lib/errors.js';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

router.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/refresh',
  validate(refreshSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.refresh(req.body.refreshToken);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/logout',
  validate(refreshSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.logout(req.body.refreshToken);
      res.status(200).json({ data: { ok: true } });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/me', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) throw unauthenticated();
    const result = await authService.me(req.auth.userId);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
