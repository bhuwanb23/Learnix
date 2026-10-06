/**
 * S-12 Notifications — routes (docs/users/12-alumni-relations.md §4).
 *
 * Mounted at `/alumni/notifications` by alumni.routes.ts, which already applies
 * `auth` + `requireRole('ALUMNI', 'ADMIN')`. So nothing here re-declares
 * authentication — every route inherits it — and what this file adds is validation
 * and the office/graduate split.
 *
 * ROUTE ORDER IS LOAD-BEARING
 * ---------------------------
 * Express matches in declaration order, so every literal segment is declared before
 * `/:id`:
 *
 *   /categories      → would otherwise be read as id="categories"
 *   /preferences     → would otherwise be read as id="preferences"
 *   /broadcasts…     → declared last, no collision
 *
 * This is the same trap `donations.routes.ts` documents for `/impact`, and the same
 * one the chapter-events path in `alumni.routes.ts` fell into. It fails quietly and
 * looks like a 404 about a missing row rather than a routing bug.
 *
 * OFFICE vs GRADUATE
 * -------------------
 * `requireOffice()` gates exactly three things: the broadcast composer, the audience
 * preview, and the reminder sweep. Reading, read-state and preferences are open to
 * every graduate including officers — an officer is also a person with an inbox, and
 * gating their inbox would mean the office could not triage its own mail.
 *
 * `validate(schema, target)` replaces the object form: the middleware takes one
 * schema and one target, and for `query`/`params` it installs an own data property
 * because Express 5's prototype getter otherwise discards the coerced value.
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { validate } from '../../../middlewares/validate.js';
import { forbidden, notFound } from '../../../lib/errors.js';
import * as directory from '../directory.service.js';
import {
  listInbox,
  getNotification,
  setRead,
  markAllRead,
  inboxCatalogue,
} from './notifications.inbox.service.js';
import { listPreferences, updatePreferences } from './notifications.prefs.service.js';
import { runReminderSweep } from './notifications.reminders.service.js';
import { createBroadcast, previewAudience, listBroadcasts, audienceOptions } from './notifications.broadcast.service.js';
import {
  broadcastCreateSchema,
  broadcastListQuerySchema,
  broadcastPreviewSchema,
  inboxQuerySchema,
  notificationIdSchema,
  preferencePatchSchema,
  readStateSchema,
  sweepSchema,
} from './notifications.schemas.js';
import { CATEGORIES, type CategoryId } from './notifications.rules.js';
import type { Audience } from './notifications.broadcast.service.js';

const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

/** Same, for middleware that never writes a response. */
const guard =
  (fn: (req: Request) => Promise<void>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    fn(req).catch(next);
  };

async function viewerFor(req: Request) {
  const institutionId = req.auth!.institutionId;
  const office = await directory.officeUserIds(institutionId);
  return directory.resolveViewer(req.auth!.userId, institutionId, office);
}

/** Middleware, not a check inside each handler — so it cannot be forgotten. */
const requireOffice = () =>
  guard(async (req) => {
    const viewer = await viewerFor(req);
    if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can do this');
  });

// ── Literals before /:id ──────────────────────────────────────────────────────

router.get(
  '/categories',
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const catalogue = await inboxCatalogue(viewer.institutionId, viewer.userId);
    // Rule metadata rides along so the app renders icons, colours and blurbs from
    // ONE source rather than hardcoding a second copy of the vocabulary in JS.
    res.json({
      ...catalogue,
      rules: CATEGORIES.map((c) => ({
        id: c.id,
        label: c.label,
        icon: c.icon,
        color: c.color,
        blurb: c.blurb,
        defaultMuted: c.defaultMuted,
        module: c.module,
      })),
    });
  }),
);

router.get(
  '/preferences',
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json(await listPreferences(viewer.institutionId, viewer.userId));
  }),
);

router.patch(
  '/preferences',
  validate(preferencePatchSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json(await updatePreferences(viewer.institutionId, viewer.userId, req.body));
  }),
);

router.get(
  '/',
  validate(inboxQuerySchema, 'query'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const q = req.query as {
      category?: CategoryId;
      unread?: string;
      important?: string;
      page?: number;
      pageSize?: number;
    };
    res.json(
      await listInbox(viewer.institutionId, viewer.userId, viewer.isOffice, {
        category: q.category,
        unreadOnly: q.unread === 'true',
        importantOnly: q.important === 'true',
        page: q.page,
        pageSize: q.pageSize,
      }),
    );
  }),
);

router.post(
  '/read-all',
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json(await markAllRead(viewer.institutionId, viewer.userId));
  }),
);

router.patch(
  '/:id/read',
  validate(notificationIdSchema, 'params'),
  validate(readStateSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const out = await setRead(viewer.institutionId, viewer.userId, String(req.params.id), Boolean(req.body.read));
    // 404, not 403: whether somebody else's notification exists is not this
    // caller's business, and a 403 would confirm that it does.
    if (!out) throw notFound('Notification not found');
    res.json({ notification: out });
  }),
);

// ── Office ────────────────────────────────────────────────────────────────────
//
// BEFORE `/:id`, deliberately. `GET /broadcasts` is a single literal segment and
// `GET /:id` is a single parameter segment, so if `/:id` were declared first it would
// capture `/broadcasts` with `id = 'broadcasts'` and answer "Notification not found" —
// a 404 about a missing row rather than a routing bug. This is the same trap
// `donations.routes.ts` documents for `/impact`, and I shipped it here first and
// caught it by reading the declaration order rather than by a test.
//
// `check-notifications.ts` now asserts the ordering statically, because a DB-backed
// test cannot see it: the services all work, only the wiring is wrong.

router.get(
  '/broadcasts',
  requireOffice(),
  validate(broadcastListQuerySchema, 'query'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ broadcasts: await listBroadcasts(viewer.institutionId, Number(req.query.limit) || undefined) });
  }),
);

router.post(
  '/broadcasts/preview',
  requireOffice(),
  validate(broadcastPreviewSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json(await previewAudience(viewer.institutionId, req.body.audience as Audience, viewer.userId));
  }),
);

/**
 * The year/city/chapter lists the composer offers.
 *
 * Static-path route, so it sits above `/:id` with the other literals. Office-only
 * because it is only useful for composing, and it is one grouped query plus one
 * chapter list — cheap, but not something an ordinary graduate needs to be able to
 * enumerate their cohort sizes for.
 */
router.get(
  '/broadcasts/options',
  requireOffice(),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json(await audienceOptions(viewer.institutionId));
  }),
);

router.post(
  '/broadcasts',
  requireOffice(),
  validate(broadcastCreateSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.status(201).json(await createBroadcast(viewer, req.body));
  }),
);

router.post(
  '/reminders/sweep',
  requireOffice(),
  validate(sweepSchema.optional()),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json(await runReminderSweep(viewer, { dryRun: req.body?.dryRun === 'true' }));
  }),
);

router.get(
  '/:id',
  validate(notificationIdSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const out = await getNotification(viewer.institutionId, viewer.userId, String(req.params.id));
    if (!out) throw notFound('Notification not found');
    res.json({ notification: out });
  }),
);

export default router;
