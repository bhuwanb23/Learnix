// F-10 Notifications — the desk's HTTP surface (docs/users/06 §3.9).
//
// This router applies its OWN auth for the same reason reports.routes.ts does:
// it is mounted as a sibling BEFORE accountsRoutes, so it no longer inherits
// `router.use(auth, requireRole(...))` from that file — the latent
// 500-instead-of-401 bug the payroll structure router had.
//
// Route order is load-bearing. `/notifications/catalogue`, `/notifications/alerts`
// and `/notifications/broadcasts` are all ONE segment after `/notifications`,
// the same shape as `/notifications/:id/read` minus the trailing one. Express
// matches in registration order, so every literal is registered before the
// parameterised route. (Today `/notifications/:id/read` is two segments and
// cannot actually collide, but the ordering costs nothing and stops the next
// literal from silently becoming an id.)
import { Router, type Request, type Response } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  idParamSchema,
  notificationBroadcastsQuerySchema,
  notificationCatalogueQuerySchema,
  notificationInboxQuerySchema,
  notificationReadSchema,
  accountsBroadcastSchema,
} from './accounts.schemas.js';
import * as svc from './notifications.service.js';
import type { InboxFilters } from './notifications.service.js';

const router = Router();

/**
 * `validate` has already coerced this, so `take` is a number and `unreadOnly` a
 * boolean here — not the strings Express gave it. (Its comment explains the
 * prototype-getter trap that makes the naive `req.query as Record<string,string>`
 * cast wrong.)
 */
const inboxFilters = (req: Request): InboxFilters =>
  req.query as unknown as InboxFilters;

router.use(auth, requireRole('ACCOUNTS', 'ADMIN'));

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: (e?: unknown) => void) => {
    fn(req, res).catch(next);
  };

// ── Literal routes ────────────────────────────────────────────────────────

/**
 * Everything the hub needs to build itself, in one round trip: the seven
 * categories with their colours, the three audiences with LIVE recipient counts,
 * and the four system alert kinds with where each one takes you.
 */
router.get(
  '/notifications/catalogue',
  validate(notificationCatalogueQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({ data: await svc.notificationCatalogue(req.auth!.institutionId) });
  }),
);

/**
 * The four computed financial alerts.
 *
 * These are recalculated on every request against live rows. Nothing writes them
 * to a table, so an alert cannot go stale after the problem is fixed and does
 * not need dismissing.
 */
router.get(
  '/notifications/alerts',
  validate(notificationCatalogueQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({ data: await svc.systemAlerts(req.auth!.institutionId) });
  }),
);

/** What this office has sent, to whom, and when. */
router.get(
  '/notifications/broadcasts',
  validate(notificationBroadcastsQuerySchema, 'query'),
  wrap(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    res.json({
      data: await svc.listBroadcasts(req.auth!.institutionId, q.take ? Number(q.take) : 20),
    });
  }),
);

/**
 * Compose and send an announcement.
 *
 * Audience resolution is tenant-scoped for every branch — the `DEFAULTERS`
 * branch was not, and delivered one college's fee reminder to every college's
 * defaulters on the instance.
 */
router.post(
  '/notifications/broadcasts',
  validate(accountsBroadcastSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await svc.createBroadcast(
        req.auth!.institutionId,
        req.auth!.userId,
        req.body,
      ),
    });
  }),
);

// ── The inbox ─────────────────────────────────────────────────────────────

/**
 * The filtered, paginated inbox.
 *
 * `outOfScope` counts messages from other modules (a bus delay, a hostel
 * complaint) that were filtered OUT, so an officer who remembers one can tell
 * it was hidden by a filter rather than lost.
 */
router.get(
  '/notifications',
  validate(notificationInboxQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await svc.listNotifications(
        req.auth!.userId,
        req.auth!.institutionId,
        inboxFilters(req),
      ),
    });
  }),
);

/** Read ONE message. Scoped to the recipient — another officer's is a 404. */
router.post(
  '/notifications/:id/read',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await svc.markRead(
        String(req.params.id),
        req.auth!.userId,
        req.auth!.institutionId,
      ),
    });
  }),
);

/**
 * Read or un-read, so a row's menu can undo a tap. `alreadyRead` is reported by
 * `markRead` above so the client can tell its optimistic update was right.
 */
router.put(
  '/notifications/:id/read',
  validate(idParamSchema, 'params'),
  validate(notificationReadSchema),
  wrap(async (req, res) => {
    res.json({
      data: await svc.setRead(
        String(req.params.id),
        req.auth!.userId,
        req.auth!.institutionId,
        (req.body as { read: boolean }).read,
      ),
    });
  }),
);

/** Read everything at once. Still scoped to the recipient and the institution. */
router.post(
  '/notifications/read-all',
  wrap(async (req, res) => {
    res.json({
      data: await svc.markAllRead(req.auth!.userId, req.auth!.institutionId),
    });
  }),
);

export default router;