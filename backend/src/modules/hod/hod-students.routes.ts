/**
 * HD-05 — The HOD's Students desk: the routes.
 * Docs: 11-hod.md §3.4
 *
 * A ROUTER OF ITS OWN, mounted BEFORE `hodRoutes` in `app.ts`, because it applies its own auth and
 * Express matches by mount order — exactly as the exam cell's dashboard router, the HOD
 * dashboard's router, the Courses desk's router and the Faculty desk's router are mounted.
 *
 * THE OLD ROUTE STAYS
 * -------------------
 * `GET /api/v1/hod/students` already existed and still answers, unchanged: the flat list with the
 * semester counts. It is NOT broken, and it is not silently replaced with a different document.
 * The desk is a new set of paths beside it.
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  hodStudentInterventionParamSchema,
  hodStudentInterventionSchema,
  hodStudentInterventionUpdateSchema,
  hodStudentParamSchema,
  hodStudentsQuerySchema,
} from './hod-students.schemas.js';
import * as service from './hod-students.service.js';
import * as detail from './hod-students.detail.js';
import * as writes from './hod-students.writes.js';
import type { RecordInterventionInput } from './hod-students.writes.js';

const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('HOD', 'ADMIN'));

// ═══ The vocabulary ════════════════════════════════════════════════════════

router.get(
  '/students/catalogue',
  wrap(async (_req, res) => {
    res.json({ data: await service.studentCatalogue() });
  }),
);

// ═══ The directory ═════════════════════════════════════════════════════════

/**
 * THE STUDENT DIRECTORY, with the at-risk list and the counts.
 */
router.get(
  '/students/directory',
  validate(hodStudentsQuerySchema, 'query'),
  wrap(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    res.json({
      data: await service.studentDirectory(
        req.auth!.userId,
        req.auth!.institutionId,
        {
          academicYearId: q.academicYearId,
          semester: q.semester ? Number(q.semester) : undefined,
          batchId: q.batchId,
          risk: q.risk,
          search: q.search,
          sort: q.sort,
        },
      ),
    });
  }),
);

// ═══ The individual student view ══════════════════════════════════════════

/**
 * THE WHOLE STUDENT — the chain, in one call.
 */
router.get(
  '/students/:studentProfileId/detail',
  validate(hodStudentParamSchema, 'params'),
  validate(hodStudentsQuerySchema, 'query'),
  wrap(async (req, res) => {
    const q = req.query as { academicYearId?: string };
    res.json({
      data: await detail.studentDetail(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.studentProfileId),
        { academicYearId: q.academicYearId },
      ),
    });
  }),
);

// ═══ The intervention writes ═══════════════════════════════════════════════

/**
 * RECORD AN INTERVENTION.
 */
router.post(
  '/students/:studentProfileId/interventions',
  validate(hodStudentParamSchema, 'params'),
  validate(hodStudentInterventionSchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await writes.recordIntervention(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.studentProfileId),
        req.body as RecordInterventionInput,
      ),
    });
  }),
);

/**
 * MOVE AN INTERVENTION ON.
 */
router.patch(
  '/students/interventions/:interventionId',
  validate(hodStudentInterventionParamSchema, 'params'),
  validate(hodStudentInterventionUpdateSchema, 'body'),
  wrap(async (req, res) => {
    const b = req.body as { status: string; notes?: string };
    res.json({
      data: await writes.updateIntervention(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.interventionId),
        b.status,
        b.notes,
      ),
    });
  }),
);

export default router;
