import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { auth } from '../../middlewares/auth.js';
import { loginSchema, refreshSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, sessionScopeSchema } from './auth.schemas.js';
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
      // The caller's own session is excluded so they are not logged out of the device
      // they just used to change the password. Every OTHER session is revoked.
      const keepTokenId = await authService.resolveTokenId(req.auth.userId, req.body.refreshToken);
      const result = await authService.changePassword(
        req.auth.userId,
        req.body.currentPassword,
        req.body.newPassword,
        keepTokenId,
      );
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Active sessions for the caller.
 *
 * GET, not POST: it reads nothing the caller has not already got, and it is the kind
 * of thing a support conversation ends with ("can you tell me where I'm logged in?").
 * The route is declared after `/change-password` but shares no path prefix with it, so
 * ordering is not load-bearing here.
 *
 * WHY THE REFRESH TOKEN ARRIVES IN A HEADER, NOT THE QUERY STRING
 * It arrived as `?refreshToken=…` first. A query string is written to access logs, kept
 * in browser history, copied into proxy logs and forwarded in `Referer` on the next
 * navigation — so the one credential that can mint new access tokens was being sprayed
 * across every component that touches a URL. `X-Refresh-Token` keeps it in the request
 * body of the TLS envelope only. The query is still accepted so an older client build
 * keeps working, but it is no longer what the app sends.
 */
router.get(
  '/sessions',
  auth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth) throw unauthenticated();
      const currentTokenId = await authService.resolveTokenId(
        req.auth.userId,
        req.get('x-refresh-token') ??
          (typeof req.query.refreshToken === 'string' ? req.query.refreshToken : undefined),
      );
      res.status(200).json({ data: await authService.listSessions(req.auth.userId, currentTokenId) });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Sign out of every other device.
 *
 * POST because it changes state, and `revokeAllSessions` is the whole point of the
 * screen: after using a shared or borrowed machine, you need to end those sessions
 * without ending your own.
 */
router.post(
  '/revoke-all-sessions',
  auth,
  validate(sessionScopeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth) throw unauthenticated();
      const keepTokenId = await authService.resolveTokenId(req.auth.userId, req.body?.refreshToken);
      res.status(200).json({ data: await authService.revokeAllSessions(req.auth.userId, keepTokenId) });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
