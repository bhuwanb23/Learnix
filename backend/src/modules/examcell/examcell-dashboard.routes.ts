/**
 * X-11 — The exam cell dashboard: the routes.
 * Docs: 05-exam-cell.md §3.1
 *
 * A ROUTER OF ITS OWN, mounted BEFORE `examcellRoutes` in `app.ts`, because it applies its own auth
 * and Express matches by mount order.
 *
 * THE OLD ROUTE IS GONE
 * ----------------------
 * `GET /api/v1/examcell/dashboard` returned `{ hero, stats, upcomingExams, recentCheating, alerts }`
 * — a flat shape with a hero banner and four counters. It counted three of the six exam statuses,
 * counted only `UNDER_REVIEW` misconduct cases when the open set is four, and answered with prose
 * strings where the new one answers with seven structured sections. It was REMOVED rather than
 * re-pointed, so a caller holding the old path gets a 404 rather than a quietly different shape.
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { assertDashboardBlock } from './examcell-dashboard.rules.js';
import { dashboardBlockParamSchema, dashboardQuerySchema } from './examcell-dashboard.schemas.js';
import * as service from './examcell-dashboard.service.js';

const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('EXAMCELL', 'ADMIN'));

/**
 * The whole screen, in one call.
 *
 * `examId` is optional: without it the screen reports the whole institution, with it the screen
 * reports one exam. It is a QUERY parameter and not a route parameter because the exam is a
 * FILTER on the same screen rather than a different screen.
 */
router.get(
  '/dashboard/overview',
  validate(dashboardQuerySchema, 'query'),
  wrap(async (req, res) => {
    const q = req.query as { examId?: string };
    res.json({
      data: await service.dashboardOverview(
        req.auth!.institutionId,
        q.examId ? String(q.examId) : undefined,
      ),
    });
  }),
);

/**
 * The vocabulary: the seven sections, the four quick actions, the six alert kinds.
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
 * the same rule every other block route in this module follows.
 */
router.get(
  '/dashboard/blocks/:block',
  validate(dashboardBlockParamSchema, 'params'),
  validate(dashboardQuerySchema, 'query'),
  wrap(async (req, res) => {
    const block = assertDashboardBlock(req.params.block);
    const q = req.query as { examId?: string };
    res.json({
      data: await service.dashboardBlock(
        req.auth!.institutionId,
        block,
        q.examId ? String(q.examId) : undefined,
      ),
    });
  }),
);

export default router;
