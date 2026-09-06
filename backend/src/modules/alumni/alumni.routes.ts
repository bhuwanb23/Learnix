import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  directoryQuerySchema,
  idParamSchema,
  rsvpDecisionSchema,
  broadcastSchema,
} from './alumni.schemas.js';
import * as service from './alumni.service.js';

// Alumni Relations module — mounted at /api/v1/alumni (docs/users/12 §4)
const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('ALUMNI', 'ADMIN'));

// AL-01 dashboard
router.get(
  '/dashboard',
  wrap(async (req, res) => {
    res.json({ data: await service.getDashboard(req.auth!.institutionId) });
  }),
);

// AL-02 directory + detail
router.get(
  '/directory',
  validate(directoryQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await service.listDirectory(
        req.auth!.institutionId,
        req.query as { q?: string; batch?: number },
      ),
    });
  }),
);

router.get(
  '/directory/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await service.getAlumniDetail(req.auth!.institutionId, String(req.params.id)) });
  }),
);

// AL-03 events + RSVP decisions
router.get(
  '/events',
  wrap(async (req, res) => {
    res.json({ data: await service.listEvents(req.auth!.institutionId) });
  }),
);

router.get(
  '/events/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await service.getEventDetail(req.auth!.institutionId, String(req.params.id)) });
  }),
);

router.post(
  '/rsvps/:id/decide',
  validate(idParamSchema, 'params'),
  validate(rsvpDecisionSchema),
  wrap(async (req, res) => {
    const result = await service.decideRsvp(
      req.auth!.institutionId,
      String(req.params.id),
      req.body.decision,
      req.auth!.userId,
    );
    res.json({ data: result });
  }),
);

// AL-04 donations + campaigns
router.get(
  '/donations',
  wrap(async (req, res) => {
    res.json({ data: await service.listDonations(req.auth!.institutionId) });
  }),
);

router.post(
  '/donations/:id/record',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const result = await service.recordDonation(
      req.auth!.institutionId,
      String(req.params.id),
      req.auth!.userId,
      req.ip ?? null,
    );
    res.json({ data: result });
  }),
);

// AL-05 mentorship
router.get(
  '/mentorship',
  wrap(async (req, res) => {
    res.json({ data: await service.listMentorship(req.auth!.institutionId) });
  }),
);

const MENTORSHIP_ACTIONS = ['approve', 'decline', 'remind'] as const;
router.post(
  '/mentorship/:id/:action',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const action = String(req.params.action);
    if (!MENTORSHIP_ACTIONS.includes(action as never)) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unknown mentorship action' } });
      return;
    }
    const result = await service.mentorshipAction(
      req.auth!.institutionId,
      String(req.params.id),
      action as 'approve' | 'decline' | 'remind',
      req.auth!.userId,
    );
    res.json({ data: result });
  }),
);

// AL-06 chapters
router.get(
  '/chapters',
  wrap(async (req, res) => {
    res.json({ data: await service.listChapters(req.auth!.institutionId) });
  }),
);

// AL-07 notifications + broadcast
router.get(
  '/notifications',
  wrap(async (req, res) => {
    res.json({ data: await service.listNotifications(req.auth!.userId, req.auth!.institutionId) });
  }),
);

router.post(
  '/notifications/read-all',
  wrap(async (req, res) => {
    res.json({
      data: await service.markAllRead(req.auth!.userId, req.auth!.institutionId),
    });
  }),
);

router.post(
  '/broadcasts',
  validate(broadcastSchema),
  wrap(async (req, res) => {
    const result = await service.createBroadcast(
      req.auth!.institutionId,
      req.auth!.userId,
      req.body,
    );
    res.status(201).json({ data: result });
  }),
);

// AL-08 profile
router.get(
  '/profile',
  wrap(async (req, res) => {
    res.json({ data: await service.getProfile(req.auth!.userId, req.auth!.institutionId) });
  }),
);

export default router;
