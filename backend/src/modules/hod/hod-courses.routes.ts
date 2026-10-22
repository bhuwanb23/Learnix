/**
 * HD-02 — The HOD's Courses desk: the routes.
 * Docs: 11-hod.md §3.3
 *
 * A ROUTER OF ITS OWN, mounted BEFORE `hodRoutes` in `app.ts`, because it applies its own auth and
 * Express matches by mount order — exactly as the exam cell's dashboard router and the HOD
 * dashboard's router are mounted.
 *
 * THE OLD ROUTES STAY, AND WHY
 * ---------------------------
 * `GET /api/v1/hod/courses` and `GET /api/v1/hod/courses/:courseId` already existed and are still
 * served by `hod.service.ts`. They are NOT broken — they are just thinner than this desk: the old
 * directory computed no attendance, no pass rate and no health, and the old detail had no
 * curriculum, no prerequisites, no students and no history.
 *
 * So the old pair is left exactly where it is, doing what it did, and the NEW desk is mounted
 * UNDERNEATH it with its own paths. The old one is not broken and it is not silently replaced
 * with a different document: a caller holding the old path gets the old document, and a caller
 * wanting the course desk asks for the desk.
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  hodCourseCurriculumSchema,
  hodCourseParamSchema,
  hodCoursePrerequisiteParamSchema,
  hodCoursePrerequisiteSchema,
  hodCourseProgramParamSchema,
  hodCourseStatusSchema,
  hodCourseUpdateSchema,
  hodCoursesQuerySchema,
} from './hod-courses.schemas.js';
import * as service from './hod-courses.service.js';
import * as detail from './hod-courses.detail.js';
import * as writes from './hod-courses.writes.js';

const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('HOD', 'ADMIN'));

// ═══ The vocabulary ════════════════════════════════════════════════════════

/**
 * The catalogue: the statuses, the types, the sorts, the health components and bands, and every
 * threshold. The screen renders from this and keeps no second copy.
 */
router.get(
  '/courses/catalogue',
  wrap(async (_req, res) => {
    res.json({ data: await service.courseCatalogue() });
  }),
);

// ═══ The directory ════════════════════════════════════════════════════════

/**
 * THE COURSE DIRECTORY, with the health badge on every row.
 */
router.get(
  '/courses/directory',
  validate(hodCoursesQuerySchema, 'query'),
  wrap(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    res.json({
      data: await service.courseDirectory(
        req.auth!.userId,
        req.auth!.institutionId,
        {
          academicYearId: q.academicYearId,
          status: q.status,
          type: q.type,
          search: q.search,
          sort: q.sort,
          page: q.page ? Number(q.page) : undefined,
        },
      ),
    });
  }),
);

/**
 * THE WHOLE COURSE — eleven panels, one call.
 */
router.get(
  '/courses/:courseId/detail',
  validate(hodCourseParamSchema, 'params'),
  validate(hodCoursesQuerySchema, 'query'),
  wrap(async (req, res) => {
    const q = req.query as { academicYearId?: string };
    res.json({
      data: await detail.courseDetail(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.courseId),
        { academicYearId: q.academicYearId },
      ),
    });
  }),
);

// ═══ The writes ══════════════════════════════════════════════════════════

/**
 * EDIT A COURSE.
 */
router.patch(
  '/courses/:courseId',
  validate(hodCourseParamSchema, 'params'),
  validate(hodCourseUpdateSchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await writes.updateCourse(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.courseId),
        req.body as Record<string, unknown>,
      ),
    });
  }),
);

/**
 * SET THE COURSE'S STATUS.
 */
router.put(
  '/courses/:courseId/status',
  validate(hodCourseParamSchema, 'params'),
  validate(hodCourseStatusSchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await writes.setCourseStatus(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.courseId),
        (req.body as { status: string }).status,
      ),
    });
  }),
);

/**
 * MAP A COURSE TO A PROGRAMME.
 */
router.post(
  '/courses/:courseId/curriculum',
  validate(hodCourseParamSchema, 'params'),
  validate(hodCourseCurriculumSchema, 'body'),
  wrap(async (req, res) => {
    const b = req.body as { programId: string; semester: number; type: string; isElective?: boolean };
    res.json({
      data: await writes.attachProgramCourse(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.courseId),
        b.programId,
        b.semester,
        b.type,
        Boolean(b.isElective),
      ),
    });
  }),
);

/**
 * UNMAP A COURSE FROM A PROGRAMME.
 */
router.delete(
  '/courses/:courseId/curriculum/:programId',
  validate(hodCourseProgramParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await writes.detachProgramCourse(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.courseId),
        String(req.params.programId),
      ),
    });
  }),
);

/**
 * ADD A PREREQUISITE.
 */
router.post(
  '/courses/:courseId/prerequisites',
  validate(hodCourseParamSchema, 'params'),
  validate(hodCoursePrerequisiteSchema, 'body'),
  wrap(async (req, res) => {
    const b = req.body as { prerequisiteCourseId: string; type: string };
    res.json({
      data: await writes.addPrerequisite(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.courseId),
        b.prerequisiteCourseId,
        b.type,
      ),
    });
  }),
);

/**
 * REMOVE A PREREQUISITE.
 */
router.delete(
  '/courses/:courseId/prerequisites/:prerequisiteCourseId',
  validate(hodCoursePrerequisiteParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await writes.removePrerequisite(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.courseId),
        String(req.params.prerequisiteCourseId),
      ),
    });
  }),
);

export default router;
