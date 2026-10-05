// F-11 Dashboard — the morning screen's HTTP surface (docs/users/06 §3.11).
//
// This router applies its OWN auth, exactly as notifications.routes.ts and
// reports.routes.ts do. It is mounted as a sibling BEFORE accountsRoutes, so it
// no longer inherits `router.use(auth, requireRole(...))` from that file — which
// is the latent 500-instead-of-401 bug the payroll structure router had: a
// request with no token reached a handler that read `req.auth!.institutionId`
// and threw.
//
// A NOTE ON WHAT THAT GATE IS AND IS NOT PROVING, because it was measured rather
// than assumed. Removing this line does NOT change what an unauthenticated caller
// gets back: every accounts router mounted here runs `router.use(auth,
// requireRole(...))`, and Express runs a `use` middleware for a request that the
// router then fails to MATCH. The first sibling mounted therefore answers
// 401/403 for the whole `/api/v1/accounts` prefix before this router is ever
// reached. So the 401 assertions in `verify-dashboard-http.ts` are evidence that
// the prefix is guarded, NOT evidence that THIS router guards itself.
//
// The gate is still load-bearing, and the reason is mount order: it is what makes
// these routes safe if this router is ever mounted first, alone, or on a path no
// sibling covers. `audit-dashboard-ui.ts` asserts the line is present, because a
// source assertion is the only kind that can see it — and `prove-dashboard-teeth.sh`
// proves that assertion bites.
//
// ROUTE ORDER IS LOAD-BEARING. `/dashboard/catalogue`, `/dashboard/overview`,
// `/dashboard/alerts`, `/dashboard/actions` and `/dashboard/blocks/<id>` are all
// one or two segments after `/dashboard`, and `/dashboard/blocks/:block` is
// matched by the same shape. Express matches in registration order, so every
// literal is registered before the parameterised one. (Today they cannot
// actually collide — the literals are two segments and the block route is three
// — but the ordering costs nothing and stops the next literal from silently
// becoming a block id.)
import { Router, type Request, type Response } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  dashboardAlertsQuerySchema, dashboardBlockParamSchema, dashboardCatalogueQuerySchema,
} from './accounts.schemas.js';
import * as svc from './dashboard.service.js';
import { assertAlertFamily, assertBlock, kindsForFamily } from './dashboard.rules.js';

const router = Router();

router.use(auth, requireRole('ACCOUNTS', 'ADMIN'));

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: (e?: unknown) => void) => {
    fn(req, res).catch(next);
  };

// ── Literal routes ────────────────────────────────────────────────────────

/**
 * Everything the screen builds itself out of, in one round trip: the seven
 * blocks with their icons and routes, the three alert families, the eight alert
 * kinds, the four quick actions, the five windows, and every threshold with the
 * sentence the app prints beside it.
 *
 * Published rather than hard-coded in the app for the reason the reports hub
 * does it: a block list copied into the app is a list that goes stale, and the
 * card would either not exist or open a block the server answers 422.
 */
router.get(
  '/dashboard/catalogue',
  validate(dashboardCatalogueQuerySchema, 'query'),
  wrap(async (_req, res) => {
    res.json({ data: await svc.dashboardCatalogue() });
  }),
);

/**
 * All seven blocks in one response.
 *
 * The hub shows every block at once, so a screen that fetched seven times could
 * show seven different moments — a dues figure taken before a collection the
 * officer had just watched land, and a payroll figure after. One call, one
 * moment.
 */
router.get(
  '/dashboard/overview',
  validate(dashboardCatalogueQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({ data: await svc.dashboardOverview(req.auth!.institutionId) });
  }),
);

/**
 * The alerts, optionally narrowed to one family.
 *
 * A misspelled family is 422, not an empty list. The reports feature had to fix
 * exactly that failure — a filter the server silently ignored returns everything
 * and looks like it worked, so a user narrows to "unusual" and reads the
 * reconciliation problems as if they were unusual transactions.
 */
router.get(
  '/dashboard/alerts',
  validate(dashboardAlertsQuerySchema, 'query'),
  wrap(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const data = await svc.alertsBlock(req.auth!.institutionId);
    if (!q.family) {
      res.json({ data });
      return;
    }
    const family = assertAlertFamily(q.family);
    res.json({
      data: {
        ...data,
        family,
        kinds: data.kinds.filter((k) => kindsForFamily(family).some((f) => f.id === k.id)),
      },
    });
  }),
);

/** The four quick actions with the live count of what each would act on. */
router.get(
  '/dashboard/actions',
  validate(dashboardCatalogueQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({ data: await svc.quickActionsBlock(req.auth!.institutionId) });
  }),
);

// ── One block on its own ──────────────────────────────────────────────────

/**
 * A single block, for a sub-screen.
 *
 * An unknown block id is 422 from `assertBlock` rather than a 404: a block is a
 * choice from a published list, not a record that might exist, so "there is no
 * block called that" is a statement about the REQUEST.
 */
router.get(
  '/dashboard/blocks/:block',
  validate(dashboardBlockParamSchema, 'params'),
  wrap(async (req, res) => {
    const block = assertBlock(req.params.block);
    const data = await svc.dashboardBlock(req.auth!.institutionId, block);
    res.json({ data: { block, ...(data as object) } });
  }),
);

export default router;
