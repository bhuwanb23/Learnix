/**
 * HD-01 — The HOD dashboard: the routes.
 * Docs: 11-hod.md §HD-01
 *
 * A ROUTER OF ITS OWN, mounted BEFORE `hodRoutes` in `app.ts`, because it applies its own auth and
 * Express matches by mount order — exactly as the exam cell's dashboard router is mounted.
 *
 * THE OLD ROUTE IS GONE
 * ---------------------
 * `GET /api/v1/hod/dashboard` returned `{ department, engagement, stats, alerts, pendingApprovals }`
 * — a hero, four counters and a list of PROSE STRINGS, with no categories, no filters and no
 * pagination.
 *
 * It also counted the leave requests INSTITUTION-WIDE, so an HOD's "pending" figure included other
 * departments' leave, and its workload query was not department-scoped, so a teacher who also
 * taught in another department inflated this department's utilisation. Both are fixed in
 * `hod.service.ts`, and both are asserted by the suites.
 *
 * The old path is **404** now, rather than re-pointed: a caller holding it gets a 404 rather than
 * a quietly different document.
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  hodDashboardBlockParamSchema,
  hodDashboardQuerySchema,
} from './hod-dashboard.schemas.js';
import { assertHodBlock } from './hod-dashboard.rules.js';
import * as service from './hod-dashboard.service.js';

const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('HOD', 'ADMIN'));

/**
 * The whole screen, in one call.
 *
 * `academicYearId` is optional: without it the screen reports the whole department, with it the
 * screen reports one academic year. It is a QUERY parameter and not a route parameter because it
 * is a FILTER on the same screen rather than a different screen.
 */
router.get(
  '/dashboard/overview',
  validate(hodDashboardQuerySchema, 'query'),
  wrap(async (req, res) => {
    const q = req.query as { academicYearId?: string };
    res.json({
      data: await service.dashboardOverview(
        req.auth!.userId,
        req.auth!.institutionId,
        q.academicYearId ? String(q.academicYearId) : undefined,
      ),
    });
  }),
);

/**
 * The vocabulary: the nine sections, the four quick actions, the six alert kinds, the health
 * components and bands, and every threshold.
 *
 * Fetched once, because it is the SERVER's vocabulary and not a filter — it does not change when
 * the filter does.
 */
router.get(
  '/dashboard/catalogue',
  wrap(async (_req, res) => {
    res.json({ data: await service.dashboardCatalogue() });
  }),
);

/**
 * One section on its own.
 *
 * The `block` is a LITERAL from the published list, and an unknown one is a 422 naming the list —
 * the same rule every other block route in this platform follows.
 */
router.get(
  '/dashboard/blocks/:block',
  validate(hodDashboardBlockParamSchema, 'params'),
  validate(hodDashboardQuerySchema, 'query'),
  wrap(async (req, res) => {
    const block = assertHodBlock(req.params.block);
    const q = req.query as { academicYearId?: string };
    res.json({
      data: await service.dashboardBlock(
        req.auth!.userId,
        req.auth!.institutionId,
        block,
        q.academicYearId ? String(q.academicYearId) : undefined,
      ),
    });
  }),
);

export default router;
