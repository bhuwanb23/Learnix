/**
 * Alumni Profile — routes (docs/users/12-alumni-relations.md §4).
 *
 * Mounted at `/alumni/profile` by alumni.routes.ts, which already applies
 * `auth` + `requireRole('ALUMNI','ADMIN')`, so nothing here re-declares authentication.
 *
 * EVERY ROUTE IS SELF-SCOPED
 * --------------------------
 * There is no `:id` parameter anywhere in this file, and that is the design rather than
 * an omission. `career/:id` and `achievements/:id` are addressed by row id, so the
 * naive shape is `PUT /career/:id` with the id in the path — which is exactly the shape
 * that produces an IDOR. The services scope every read and write through
 * `profile.userId === viewer.userId`, and the id is read from the body instead, so a
 * guessed id returns 404 rather than editing somebody else's timeline.
 *
 * The one exception is `achievements/:id/verify`, which legitimately acts on somebody
 * else's row — and is therefore office-gated, institution-scoped, and audited.
 *
 * ROUTE ORDER
 * -----------
 * `/career` (list) is declared before `/career/:id`-style paths because Express matches
 * in declaration order. There is no bare `/:id` here, so the specific trap from
 * notifications.routes.ts does not arise — but the same static assertion in
 * `check-profile.ts` guards it anyway rather than relying on that staying true.
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { validate } from '../../../middlewares/validate.js';
import { forbidden } from '../../../lib/errors.js';
import * as directory from '../directory.service.js';
import { getProfileSelf, updateProfile } from './profile.service.js';
import {
  addCareerEntry,
  listCareer,
  removeCareerEntry,
  setCareerHighlight,
  updateCareerEntry,
  officeUpdateCareerEntry,
} from './career.service.js';
import {
  addAchievement,
  listAchievements,
  removeAchievement,
  setVerified,
  updateAchievement,
  verificationQueue,
} from './achievements.service.js';
import {
  achievementSchema,
  achievementUpdateSchema,
  achievementVerifySchema,
  careerEntrySchema,
  careerUpdateSchema,
  idParamSchema,
  updateProfileSchema,
} from './profile.schemas.js';

const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

/** Same as `wrap`, for middleware that never writes a response. */
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

const requireOffice = () =>
  guard(async (req) => {
    const viewer = await viewerFor(req);
    if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can do this');
  });

// ── The profile itself ─────────────────────────────────────────────────────────

/**
 * Unredacted self-view.
 *
 * Distinct from `GET /alumni/me`, which returns the profile WITH the owner's own
 * privacy applied. That difference is deliberate and is the reason both exist: the
 * directory-facing `/me` is what other screens and the "view as a stranger" preview
 * need, and it must apply the owner's privacy settings or the privacy screen would be
 * lying about what is published. This one is what the edit screen loads, and it does
 * not — otherwise "hide my email" would be indistinguishable from "delete my email",
 * because you could not see the value you had hidden.
 */
router.get(
  '/',
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await getProfileSelf(viewer) });
  }),
);

router.put(
  '/',
  validate(updateProfileSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await updateProfile(viewer, req.body) });
  }),
);

// ── Career milestones ──────────────────────────────────────────────────────────

router.get(
  '/career',
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await listCareer(viewer) });
  }),
);

router.post(
  '/career',
  validate(careerEntrySchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.status(201).json({ data: await addCareerEntry(viewer, req.body) });
  }),
);

router.put(
  '/career/:id',
  validate(idParamSchema, 'params'),
  validate(careerUpdateSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await updateCareerEntry(viewer, String(req.params.id), req.body) });
  }),
);

/** Office-only correction of somebody else's timeline. */
router.put(
  '/career/:id/office',
  requireOffice(),
  validate(idParamSchema, 'params'),
  validate(careerUpdateSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await officeUpdateCareerEntry(viewer, String(req.params.id), req.body) });
  }),
);

router.patch(
  '/career/:id/highlight',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await setCareerHighlight(viewer, String(req.params.id), Boolean(req.body?.isHighlight)) });
  }),
);

router.delete(
  '/career/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await removeCareerEntry(viewer, String(req.params.id)) });
  }),
);

// ── Achievements ───────────────────────────────────────────────────────────────

router.get(
  '/achievements',
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await listAchievements(viewer) });
  }),
);

router.post(
  '/achievements',
  validate(achievementSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.status(201).json({ data: await addAchievement(viewer, req.body) });
  }),
);

router.put(
  '/achievements/:id',
  validate(idParamSchema, 'params'),
  validate(achievementUpdateSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await updateAchievement(viewer, String(req.params.id), req.body) });
  }),
);

router.delete(
  '/achievements/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await removeAchievement(viewer, String(req.params.id)) });
  }),
);

/** The office's verification queue: unverified claims, oldest first. */
router.get(
  '/achievements/queue',
  requireOffice(),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await verificationQueue(viewer, Number(req.query.limit) || undefined) });
  }),
);

/**
 * Verify / un-verify.
 *
 * Declared AFTER `/achievements/queue` on purpose. Both are two-segment literals but
 * the queue is GET and this is POST, so they would not actually collide — it is
 * ordered this way because it is the safer order if a verb is ever added.
 */
router.post(
  '/achievements/:id/verify',
  requireOffice(),
  validate(idParamSchema, 'params'),
  validate(achievementVerifySchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await setVerified(viewer, String(req.params.id), Boolean(req.body?.verified)) });
  }),
);

export default router;