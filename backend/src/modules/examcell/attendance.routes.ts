/**
 * X-11 — Exam attendance: the routes.
 * Docs: 05-exam-cell.md §3.1
 *
 * A ROUTER OF ITS OWN, mounted BEFORE `examcellRoutes` in `app.ts`, because the attendance surface
 * applies its own auth and Express matches by mount order. A router declared after another one
 * answering the same path is a router that never runs.
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { attendanceSlotParamSchema, markAttendanceSchema } from './attendance.schemas.js';
import * as service from './attendance.service.js';

const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('EXAMCELL', 'ADMIN'));

/**
 * The roll for one paper.
 *
 * Every student who should be in the room, with PRESENT, ABSENT or UNMARKED against them. The
 * third state is not an oversight — it is the difference between "nobody turned up" and "the
 * invigilator has not been through yet".
 */
router.get(
  '/attendance/slots/:slotId',
  validate(attendanceSlotParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.listAttendance(
        req.auth!.institutionId,
        String(req.params.slotId),
      ),
    });
  }),
);

/**
 * Mark the roll.
 *
 * A BULK write, because an invigilator takes a roll on a phone in a room and does not submit one
 * request per student. Idempotent: the same student marked twice is corrected, not duplicated.
 */
router.post(
  '/attendance/slots/:slotId',
  validate(attendanceSlotParamSchema, 'params'),
  validate(markAttendanceSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.markAttendance(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.slotId),
        req.body,
      ),
    });
  }),
);

/**
 * The summary the dashboard reads.
 *
 * Per slot, because an institution-wide aggregate hides the fact that one paper was taken and
 * four were not.
 */
router.get(
  '/attendance/summary',
  wrap(async (req, res) => {
    const q = req.query as { examId?: string };
    res.json({
      data: await service.attendanceSummary(
        req.auth!.institutionId,
        q.examId ? String(q.examId) : undefined,
      ),
    });
  }),
);

export default router;
