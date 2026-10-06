// X-02 Timetable — the HTTP surface (docs/users/05 §3.9).
//
// This router applies its OWN auth and is mounted BEFORE `examcellRoutes`, so it
// inherits nothing from it. That is deliberate and it is the same lesson the
// accounts dashboard had to learn the hard way: a router mounted as a sibling
// and relying on someone else's `router.use(auth, ...)` is one reorder away from
// serving the whole prefix to anybody.
//
// A NOTE ON WHAT THE 401s DO AND DO NOT PROVE, because it was measured rather
// than assumed. Removing `router.use(auth, ...)` from THIS file does not change
// what an unauthenticated caller gets back, because `examcellRoutes` also runs
// a `use` middleware for a request it then fails to MATCH — and Express runs
// `use` for non-matching paths too. So the first sibling mounted answers 401 for
// the whole `/api/v1/examcell` prefix before this router is reached. The HTTP
// suite's 401 assertions are therefore evidence that the PREFIX is guarded, not
// that this router guards itself. `audit-timetable-ui.ts` asserts the line at
// source level, and `prove-timetable-teeth.sh` proves that assertion bites.
//
// ROUTE ORDER IS LOAD-BEARING. `/timetable/catalogue`, `/timetable/overview`
// and `/timetable/exams` are all two segments past `/timetable`, and Express
// matches in registration order, so every literal is registered before any
// parameterised path. Today a literal cannot actually be captured as an id —
// `/timetable/exams/:id` has an extra segment — but the ordering costs nothing
// and stops the next literal from silently becoming an exam id.
import { Router, type Request, type Response } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  addTimetableSlotSchema, allocateVenueSchema, assignInvigilatorSchema,
  completeTimetableSlotSchema, createTimetableExamSchema, publishTimetableExamSchema,
  rescheduleTimetableSlotSchema, timetableAllocationParamSchema, timetableBlockQuerySchema,
  timetableCatalogueQuerySchema, timetableExamParamSchema, timetableSlotParamSchema,
  timetableStudentsQuerySchema, updateTimetableExamSchema,
} from './examcell.schemas.js';
import { assertBlock } from './timetable.rules.js';
import * as svc from './timetable.service.js';

const router = Router();

router.use(auth, requireRole('EXAMCELL', 'ADMIN'));

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: (e?: unknown) => void) => {
    fn(req, res).catch(next);
  };

const inst = (req: Request) => req.auth!.institutionId;
const actor = (req: Request) => req.auth!.userId;

// ══ Reads ════════════════════════════════════════════════════════════════

/**
 * Everything the app builds itself out of, in one round trip: the eight blocks
 * with their icons and routes, the eight conflict kinds WITH the `blocking` flag
 * and severity the app colours by, the exam types and statuses, and every
 * threshold with the policy sentence printed beside it.
 *
 * The `blocking` flag is published rather than re-implemented on the client,
 * because a client that decides for itself which clashes are fatal will
 * eventually disagree with the server about which writes are allowed.
 */
router.get(
  '/timetable/catalogue',
  validate(timetableCatalogueQuerySchema, 'query'),
  wrap(async (_req, res) => {
    res.json({ data: await svc.timetableCatalogue() });
  }),
);

/**
 * All eight blocks in one response.
 *
 * The hub shows them all at once. A screen that fetched eight times could show
 * eight different moments — a conflicts count computed before the slot the
 * officer had just added, and a calendar drawn after it.
 */
router.get(
  '/timetable/overview',
  validate(timetableBlockQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({ data: await svc.timetableOverview(inst(req)) });
  }),
);

/**
 * One block on its own, for a sub-screen, so opening one does not pay for the
 * other seven.
 *
 * An unknown block id is 422 from `assertBlock`: a block is a choice from a
 * published list, not a record that might exist.
 */
router.get(
  '/timetable/blocks/:block',
  validate(timetableBlockQuerySchema, 'query'),
  wrap(async (req, res) => {
    const block = assertBlock(req.params.block);
    const result = await svc.timetableBlock(inst(req), block);
    // EXAMS, ALLOCATION and STUDENTS return a bare ARRAY. Spreading an array
    // into this envelope rewrites `[{ ... }]` as `{ "0": { ... } }`, and the
    // three screens that read those blocks do `data ?? []` and then `.reduce`
    // — which throws on an object, taking Exam Schedules, Course Allocation and
    // Student Timetable down on render. Arrays pass through untouched; objects
    // keep the canonical `block` echo the HTTP suite asserts.
    res.json({ data: Array.isArray(result) ? result : { block, ...result } });
  }),
);

/**
 * One student's season.
 *
 * A separate route rather than a `studentProfileId` filter on the STUDENTS
 * block, because "show me this student" is what the STUDENT app will call and
 * it should not have to know that a timetable block exists.
 */
router.get(
  '/timetable/students/:studentProfileId',
  validate(timetableStudentsQuerySchema, 'query'),
  wrap(async (req, res) => {
    const data = await svc.studentsBlock(inst(req), String(req.params.studentProfileId));
    if (data.length === 0) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Student not found for this institution' },
      });
      return;
    }
    res.json({ data: data[0] });
  }),
);

// ══ Exam schedules ═══════════════════════════════════════════════════════

router.post(
  '/timetable/exams',
  validate(createTimetableExamSchema),
  wrap(async (req, res) => {
    res.status(201).json({ data: await svc.createExam(inst(req), actor(req), req.body) });
  }),
);

router.patch(
  '/timetable/exams/:id',
  validate(timetableExamParamSchema, 'params'),
  validate(updateTimetableExamSchema),
  wrap(async (req, res) => {
    res.json({ data: await svc.updateExam(inst(req), actor(req), String(req.params.id), req.body) });
  }),
);

/**
 * Publish. REFUSED while any HIGH clash is unresolved, and the response names
 * them — see `publishExam`.
 */
router.post(
  '/timetable/exams/:id/publish',
  validate(timetableExamParamSchema, 'params'),
  validate(publishTimetableExamSchema),
  wrap(async (req, res) => {
    res.json({ data: await svc.publishExam(inst(req), actor(req), String(req.params.id)) });
  }),
);

// ══ Slots ════════════════════════════════════════════════════════════════

router.post(
  '/timetable/exams/:id/slots',
  validate(timetableExamParamSchema, 'params'),
  validate(addTimetableSlotSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await svc.addSlot(inst(req), actor(req), String(req.params.id), req.body),
    });
  }),
);

/**
 * Move a slot.
 *
 * `PATCH` rather than the old `POST /slots/:id/reschedule`, because a reschedule
 * is an UPDATE of the slot and pretending it is a command makes it impossible to
 * send a partial change. The old route is removed below.
 */
router.patch(
  '/timetable/slots/:id',
  validate(timetableSlotParamSchema, 'params'),
  validate(rescheduleTimetableSlotSchema),
  wrap(async (req, res) => {
    res.json({
      data: await svc.rescheduleSlot(inst(req), actor(req), String(req.params.id), req.body),
    });
  }),
);

router.delete(
  '/timetable/slots/:id',
  validate(timetableSlotParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await svc.deleteSlot(inst(req), actor(req), String(req.params.id)) });
  }),
);

router.post(
  '/timetable/slots/:id/complete',
  validate(timetableSlotParamSchema, 'params'),
  validate(completeTimetableSlotSchema),
  wrap(async (req, res) => {
    res.json({
      data: await svc.completeSlot(inst(req), actor(req), String(req.params.id)),
    });
  }),
);

// ══ Centres & invigilators ═══════════════════════════════════════════════

/**
 * Allocate a venue to a slot.
 *
 * Note the field is `venueId`, not `roomId`. `Room` in the schema is a HOSTEL
 * room — capacity 2, hanging off a block — and `Venue` is the institution-wide
 * room master with real capacity. The old endpoint took a `roomId` string and
 * wrote it straight into a scalar column with nothing to check it against.
 */
router.post(
  '/timetable/slots/:id/venues',
  validate(timetableSlotParamSchema, 'params'),
  validate(allocateVenueSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await svc.allocateVenue(inst(req), actor(req), String(req.params.id), req.body),
    });
  }),
);

router.put(
  '/timetable/allocations/:id/invigilator',
  validate(timetableAllocationParamSchema, 'params'),
  validate(assignInvigilatorSchema),
  wrap(async (req, res) => {
    res.json({
      data: await svc.assignInvigilator(inst(req), actor(req), String(req.params.id), req.body),
    });
  }),
);

export default router;