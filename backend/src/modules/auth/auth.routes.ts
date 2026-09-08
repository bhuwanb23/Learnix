import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { auth } from '../../middlewares/auth.js';
import { loginSchema, refreshSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from './auth.schemas.js';
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

// X-02 — password reset flow
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.forgotPassword(req.body.email);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.resetPassword(req.body.token, req.body.password);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/change-password',
  auth,
  validate(changePasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth) throw unauthenticated();
      const result = await authService.changePassword(
        req.auth.userId,
        req.body.currentPassword,
        req.body.newPassword,
      );
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
