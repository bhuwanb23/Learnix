/**
 * Staff complaints — the support worker's side.
 * Mounted at `/api/v1/staff-complaints`. Docs: 08-hostel.md §3.7
 *
 * WHY A SEPARATE ROUTER, AND WHY THIS MATTERS
 * --------------------------------------------
 * A maintenance technician and a security officer need to see and close the complaints assigned to
 * them. They must not see anything else in the hostel module. The `hostel` router is gated
 * `requireRole('HOSTEL','ADMIN')`, so the two ways to give support staff access are:
 *
 *   a. add `MAINTENANCE` to that router's role list — which would hand a technician room allocation,
 *      every resident profile, the gate-pass register and the visitor register. All of those are
 *      about residents' MOVEMENTS, which is precisely what a plumber has no business browsing.
 *   b. give support staff their own small router, gated on their own role.
 *
 * This is (b). The gate is `requireRole('MAINTENANCE','HOSTEL','ADMIN')` — `HOSTEL` and `ADMIN` are
 * included so a warden can use the same inbox, and `MAINTENANCE` is the technician/security officer.
 *
 * Note the honest limitation: this router does NOT add per-permission guards the way the mess
 * expense route does. Role membership is the gate here. That is a deliberate scope choice for a small
 * surface whose every route is a complaint action, and it should not be copied as a pattern for
 * larger staff surfaces.
 *
 * WHAT SUPPORT STAFF CAN AND CANNOT DO
 * -------------------------------------
 *   CAN:   see their inbox, add a note, resolve a complaint.
 *   CANNOT: assign (that is the warden's triage call), see every resident, or reach any other module.
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { idParamSchema } from '../accounts/accounts.schemas.js';
import {
  complaintNoteSchema,
  complaintResolveSchema,
} from '../hostel/hostel.schemas.js';
import * as complaints from '../hostel/hostel-complaints.service.js';

// Same tiny helper every router in this codebase defines locally, rather than a shared import.
const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

const router = Router();

router.use(auth, requireRole('MAINTENANCE', 'HOSTEL', 'ADMIN'));

/**
 * The inbox: assigned to me, plus unassigned complaints in a category group my designation covers.
 *
 * The group filter is what stops a plumber seeing a security complaint. Not a leak — the data is not
 * sensitive to them — but an inbox full of somebody else's work is an inbox nobody reads, and the
 * whole point of a staff inbox is that the next job is visible.
 */
router.get(
  '/complaints',
  wrap(async (req, res) => {
    res.json({ data: await complaints.getStaffInbox(req.auth!.userId, req.auth!.institutionId) });
  }),
);

/**
 * Resolve a complaint. Only the assignee, a warden, or an admin can close it out — enforced in the
 * service via the `staff` role's identity check, so the rule lives with the data rather than only in
 * the route.
 */
router.post(
  '/complaints/:id/resolve',
  validate(idParamSchema, 'params'),
  validate(complaintResolveSchema),
  wrap(async (req, res) => {
    res.json({
      data: await complaints.resolveComplaint(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        req.body,
      ),
    });
  }),
);

router.post(
  '/complaints/:id/notes',
  validate(idParamSchema, 'params'),
  validate(complaintNoteSchema),
  wrap(async (req, res) => {
    res.json({
      data: await complaints.addNote(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        req.body,
        'staff',
      ),
    });
  }),
);

export default router;