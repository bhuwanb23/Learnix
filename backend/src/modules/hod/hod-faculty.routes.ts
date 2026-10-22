/**
 * HD-02 — The HOD's Faculty desk: the routes.
 * Docs: 11-hod.md §3.2
 *
 * A ROUTER OF ITS OWN, mounted BEFORE `hodRoutes` in `app.ts`, because it applies its own auth and
 * Express matches by mount order — exactly as the exam cell's dashboard router, the HOD
 * dashboard's router and the Courses desk's router are mounted.
 *
 * THE OLD ROUTE STAYS
 * -------------------
 * `GET /api/v1/hod/faculty` already existed and still answers, unchanged: the flat list with the
 * workload bar. It is NOT broken, and it is not silently replaced with a different document.
 * The desk is a new set of paths beside it.
 *
 * AND THE OLD LIST NOW MEANS THE SAME THING
 * -----------------------------------------
 * The old list measured the load in schedule-slot COUNT against a hours limit, so a three-hour
 * lecture counted as one hour. It measures HOURS now — the same unit the reassign guard, the
 * dashboard's workload section and this desk use.
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { hodFacultyParamSchema, hodFacultyQuerySchema } from './hod-faculty.schemas.js';
import * as service from './hod-faculty.service.js';
import * as detail from './hod-faculty.detail.js';

const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('HOD', 'ADMIN'));

// ═══ The vocabulary ════════════════════════════════════════════════════════

/**
 * The catalogue: the workload bands, the insight legs and bands, the statuses, the sorts, the
 * availability days and every threshold. The screen renders from this and keeps no second copy.
 */
router.get(
  '/faculty/catalogue',
  wrap(async (_req, res) => {
    res.json({ data: await service.facultyCatalogue() });
  }),
);

// ═══ The directory ═════════════════════════════════════════════════════════

/**
 * THE FACULTY DIRECTORY, with the workload balancer, the availability matrix and the teaching
 * progress monitor.
 */
router.get(
  '/faculty/directory',
  validate(hodFacultyQuerySchema, 'query'),
  wrap(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    res.json({
      data: await service.facultyDirectory(
        req.auth!.userId,
        req.auth!.institutionId,
        {
          academicYearId: q.academicYearId,
          status: q.status,
          band: q.band,
          search: q.search,
          sort: q.sort,
        },
      ),
    });
  }),
);

// ═══ The individual faculty view ══════════════════════════════════════════

/**
 * THE WHOLE TEACHER — the chain, in one call.
 */
router.get(
  '/faculty/:userId/detail',
  validate(hodFacultyParamSchema, 'params'),
  validate(hodFacultyQuerySchema, 'query'),
  wrap(async (req, res) => {
    const q = req.query as { academicYearId?: string };
    res.json({
      data: await detail.facultyDetail(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.userId),
        { academicYearId: q.academicYearId },
      ),
    });
  }),
);

export default router;
