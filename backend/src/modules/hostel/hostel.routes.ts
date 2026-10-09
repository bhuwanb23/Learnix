import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { validate } from '../../middlewares/validate.js';
import {
  idParamSchema,
  bedParamSchema,
  allocateSchema,
  menuSchema,
  messMarkSchema,
  messRollQuerySchema,
  messWindowQuerySchema,
  messSurveySchema,
  messExpenseSchema,
  complaintSchema,
  complaintAssignSchema,
  complaintResolveSchema,
  complaintNoteSchema,
  complaintReopenSchema,
  complaintQuerySchema,
  complaintPolicySchema,
  broadcastSchema,
  residentQuerySchema,
  contactSchema,
  roomQuerySchema,
  roomIdParamSchema,
  bedMaintenanceSchema,
  gatePassQuerySchema,
  gatePassDecisionSchema,
  gatePassStampSchema,
  visitorQuerySchema,
  frequentVisitorQuerySchema,
  visitorRegisterSchema,
  visitorDecisionSchema,
  visitorStampSchema,
  barredVisitorSchema,
  visitorPolicySchema,
} from './hostel.schemas.js';
import * as service from './hostel.service.js';
import * as visitors from './hostel-visitors.service.js';
import * as complaints from './hostel-complaints.service.js';
import {
  listContacts,
  upsertContact,
  deleteContact,
} from './hostel-contacts.service.js';

const roomTargetSchema = z.object({ toRoomNumber: z.string().trim().min(3).max(16) });

// Hostel module — mounted at /api/v1/hostel (docs/users/08 §4)
const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('HOSTEL', 'ADMIN'));

// H-01 dashboard
router.get(
  '/dashboard',
  wrap(async (req, res) => {
    res.json({ data: await service.getDashboard(req.auth!.institutionId) });
  }),
);

// ── Rooms (docs/users/08-hostel.md §3.2) ───────────────────────────────────────

router.get(
  '/rooms',
  validate(roomQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({ data: await service.listRooms(req.auth!.institutionId, req.query) });
  }),
);

// Keyed by room ID, not room number. `Room.number` is unique only WITHIN a block
// (`@@unique([blockId, number])`), so two blocks may both hold "A-101" — and the old
// `findFirst({ where: { number } })` would then serve one of them arbitrarily, showing the
// wrong room's occupants.
router.get(
  '/rooms/:roomId',
  validate(roomIdParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.getRoomDetail(req.auth!.institutionId, String(req.params.roomId)),
    });
  }),
);

// Who has stayed in this room, and when they moved in and out. Derived from the same
// allocation rows the resident timeline reads — the data was always written, never read.
router.get(
  '/rooms/:roomId/history',
  validate(roomIdParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.listRoomHistory(req.auth!.institutionId, String(req.params.roomId)),
    });
  }),
);

// H-03 allocations
router.post(
  '/allocations',
  validate(allocateSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await service.allocateBed(req.auth!.userId, req.auth!.institutionId, req.body),
    });
  }),
);

router.post(
  '/beds/:bedId/vacate',
  validate(bedParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.vacateBed(req.auth!.userId, req.auth!.institutionId, String(req.params.bedId)),
    });
  }),
);

router.post(
  '/beds/:bedId/transfer',
  validate(bedParamSchema, 'params'),
  validate(roomTargetSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.transferResident(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.bedId),
        req.body.toRoomNumber,
      ),
    });
  }),
);

// Withdraw a bed for maintenance, or return it to service.
//
// A bed STATE transition, not inventory CRUD — there is no create or delete of blocks, rooms
// or beds anywhere in this module; the inventory is seed-defined.
router.post(
  '/beds/:bedId/maintenance',
  validate(bedParamSchema, 'params'),
  validate(bedMaintenanceSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.setBedMaintenance(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.bedId),
        req.body.inMaintenance === true,
        req.body.note,
      ),
    });
  }),
);

// ── Residents (docs/users/08-hostel.md §3.3) ────────────────────────────────────
//
// Ordering matters here: `/residents/:id` would otherwise swallow `/residents/search`,
// `/residents/facets` and the sub-resource paths. The static segments are declared first
// so Express matches them before the parameterised one.

router.get(
  '/residents',
  validate(residentQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({ data: await service.listResidents(req.auth!.institutionId, req.query) });
  }),
);

router.get(
  '/residents/facets',
  wrap(async (req, res) => {
    res.json({ data: await service.getResidentFacets(req.auth!.institutionId) });
  }),
);

router.get(
  '/residents/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.getResidentDetail(req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

// Residential move-in/move-out timeline. Derived from `HostelAllocation.fromDate`/`toDate`,
// which `allocateBed` already populates on transfer and vacate.
router.get(
  '/residents/:id/history',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.listResidenceHistory(req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

// Guardians + emergency contacts, in their own service because a contact row is the one
// record in this module with no block in its ancestry — hence its own tenant guard.
router.get(
  '/residents/:id/contacts',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await listContacts(req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

router.post(
  '/residents/:id/contacts',
  validate(idParamSchema, 'params'),
  validate(contactSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await upsertContact(
        req.auth!.institutionId,
        String(req.params.id),
        req.body,
        req.auth!.userId,
      ),
    });
  }),
);

router.put(
  '/residents/:id/contacts/:contactId',
  validate(idParamSchema, 'params'),
  validate(contactSchema),
  wrap(async (req, res) => {
    res.json({
      data: await upsertContact(
        req.auth!.institutionId,
        String(req.params.id),
        { ...req.body, id: String(req.params.contactId) },
        req.auth!.userId,
      ),
    });
  }),
);

router.delete(
  '/residents/:id/contacts/:contactId',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await deleteContact(
        req.auth!.institutionId,
        String(req.params.id),
        String(req.params.contactId),
        req.auth!.userId,
      ),
    });
  }),
);

// Leave/absence history. `GatePass` already recorded `outAt`, `expectedInAt` and
// `actualInAt`; this surfaces it on the resident's own page instead of the warden inbox.
router.get(
  '/residents/:id/absence',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.listAbsence(req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

// H-09 rent dues
router.post(
  '/rent/:id/collect',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const method = (req.body?.method as 'UPI' | 'NET_BANKING' | 'CARD' | 'CASH') ?? 'CASH';
    res.json({
      data: await service.markRentPaid(req.auth!.userId, req.auth!.institutionId, String(req.params.id), method),
    });
  }),
);

// ── H-05 Mess (docs/users/08-hostel.md §3.4) ───────────────────────────────
//
// ROUTE ORDER MATTERS HERE. Every path below is a static sibling under `/mess`, and none of them
// is a `:param`, so none can be shadowed - but `roll` and `absent` are single segments and must be
// declared BEFORE anything that could match them, so they are all literal-first by construction and
// `verify-hostel/mess.ts` asserts each one individually by name.
//
// THE TWO SIDES OF THE MESS
// -------------------------
// The roll, the menu editor, the log and the analytics are warden-side and sit on this router
// behind `requireRole('HOSTEL','ADMIN')`. A student's rating does NOT live here: it is on
// `/student/mess`, because a resident must never be able to reach a write that belongs to mess
// staff, and because creating it on this router would put it behind the HOSTEL role gate.
router.get(
  '/mess',
  wrap(async (req, res) => {
    res.json({ data: await service.getMess(req.auth!.institutionId) });
  }),
);

router.get(
  '/mess/menu',
  wrap(async (req, res) => {
    res.json({ data: await service.getMessMenu(req.auth!.institutionId) });
  }),
);

router.put(
  '/mess/menu',
  validate(menuSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.setMessMenu(req.auth!.userId, req.auth!.institutionId, req.body),
    });
  }),
);

// The roll: who is here, who already ate, and who to chase.
router.get(
  '/mess/roll',
  validate(messRollQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await service.getRoll(
        req.auth!.institutionId,
        req.query.date as string | undefined,
        req.query.meal as any,
      ),
    });
  }),
);

router.post(
  '/mess/attendance',
  validate(messMarkSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.markMealAttendance(req.auth!.userId, req.auth!.institutionId, req.body),
    });
  }),
);

router.get(
  '/mess/attendance',
  validate(messWindowQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await service.getAttendanceLog(
        req.auth!.institutionId,
        req.query.from as string | undefined,
        req.query.to as string | undefined,
        req.query.days as number | undefined,
      ),
    });
  }),
);

router.get(
  '/mess/absent',
  validate(messRollQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await service.getAbsent(
        req.auth!.institutionId,
        req.query.date as string | undefined,
        req.query.meal as any,
      ),
    });
  }),
);

router.get(
  '/mess/analytics',
  validate(messWindowQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await service.getMessAnalytics(
        req.auth!.institutionId,
        req.query.from as string | undefined,
        req.query.to as string | undefined,
        req.query.days as number | undefined,
      ),
    });
  }),
);

router.get(
  '/mess/feedback',
  validate(messWindowQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await service.listMessFeedback(
        req.auth!.institutionId,
        req.query.from as string | undefined,
        req.query.to as string | undefined,
        req.query.days as number | undefined,
      ),
    });
  }),
);

router.post(
  '/mess/survey',
  validate(messSurveySchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.sendMessSurvey(
        req.auth!.userId,
        req.auth!.institutionId,
        req.body?.meal,
      ),
    });
  }),
);

// ── Mess money ─────────────────────────────────────────────────────────────────
//
// GUARDED BY A CAPABILITY, NOT BY A ROLE. These two routes read and write `Expense`, which is the
// institution's financial ledger. Every other route to that table is behind
// `requireRole('ACCOUNTS','ADMIN')` on the Accounts router, and a warden has only the HOSTEL role,
// so without this they could not see a rupee of mess spend.
//
// The alternative - giving the warden the ACCOUNTS role - was rejected deliberately: it would also
// hand over `payroll.run`, `fees.waive`, scholarships and every financial report. A narrow,
// audited, admin-editable permission is the smallest thing that opens exactly this one door.
//
// It is also the first route in the platform to actually ENFORCE `RolePermission`, which until now
// was modelled, seeded, displayed on the user's profile, administered through
// `/platform/roles/:role/permissions` and audited - but never checked. See
// `middlewares/requirePermission.ts` for what that means and what it does not.
//
// A raised claim is PENDING and is approved by the accounts desk, not by its own author.
router.get(
  '/mess/expenses',
  requirePermission('hostel.mess.expenses'),
  validate(messWindowQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await service.getMessExpenses(
        req.auth!.institutionId,
        req.query.from as string | undefined,
        req.query.to as string | undefined,
        req.query.days as number | undefined,
      ),
    });
  }),
);

router.post(
  '/mess/expenses',
  requirePermission('hostel.mess.expenses'),
  validate(messExpenseSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await service.raiseMessExpense(req.auth!.userId, req.auth!.institutionId, req.body),
    });
  }),
);

// ── Gate passes (docs/users/08-hostel.md §3.5) ─────────────────────────────
//
// Creation is NOT here. A pass is requested by the STUDENT, from `/api/v1/student/gate-passes`
// — putting a create route in this router would put it behind `requireRole('HOSTEL','ADMIN')`,
// which is precisely the role that must not be able to mint its own approvals.

router.get(
  '/gate-passes',
  validate(gatePassQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await service.listGatePasses(req.auth!.institutionId, req.query),
    });
  }),
);

// Sorted by urgency rather than createdAt: an overdue return and an emergency request outrank
// anything already sitting in the queue.
router.get(
  '/gate-passes/overdue',
  wrap(async (req, res) => {
    res.json({ data: await service.listOverduePasses(req.auth!.institutionId) });
  }),
);

router.get(
  '/gate-passes/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.getGatePass(req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

router.post(
  '/gate-passes/:id/decide',
  validate(idParamSchema, 'params'),
  validate(gatePassDecisionSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.decideGatePass(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        req.body.decision,
        { verified: req.body.verified, note: req.body.note },
      ),
    });
  }),
);

// Recording the gate. `/exit` and `/return` are separate verbs rather than one `stamp` with a
// flag, because they are different facts with different preconditions — a return requires a
// recorded exit, and a generic endpoint would have to re-derive which one was meant.
router.post(
  '/gate-passes/:id/exit',
  validate(idParamSchema, 'params'),
  validate(gatePassStampSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.recordGateExit(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        req.body.at,
      ),
    });
  }),
);

router.post(
  '/gate-passes/:id/return',
  validate(idParamSchema, 'params'),
  validate(gatePassStampSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.recordGateReturn(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        req.body.at,
      ),
    });
  }),
);

// ── H-07 Complaints (docs/users/08-hostel.md §3.7) ───────────────────────────────
//
// THE THREE SIDES, ON THREE ROUTERS
// ---------------------------------
// The warden is here, on `/hostel/complaints`. The resident is on `/student/complaints`, because a
// resident must not be able to reach a write that belongs to the desk. Support staff are on a
// SEPARATE `/api/v1/staff-complaints` router, because adding the MAINTENANCE role to this router's
// `requireRole('HOSTEL','ADMIN')` would hand a technician room allocations, resident profiles, gate
// passes and the visitor register.
//
// Every path below is a literal except `:id`, and the literals are declared first so nothing can
// swallow them.
router.get(
  '/complaints',
  validate(complaintQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await complaints.listComplaints(req.auth!.institutionId, {
        status: req.query.status as string | undefined,
        category: req.query.category as string | undefined,
        severity: req.query.severity as string | undefined,
        escalated: req.query.escalated as string | undefined,
        q: req.query.q as string | undefined,
        assignedToUserId: req.query.assignedToUserId as string | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      }),
    });
  }),
);

// The editable policy - thresholds a warden can change without a deploy.
router.get(
  '/complaints/policy',
  wrap(async (req, res) => {
    res.json({ data: await complaints.loadPolicy(req.auth!.institutionId) });
  }),
);

router.put(
  '/complaints/policy',
  validate(complaintPolicySchema),
  wrap(async (req, res) => {
    res.json({
      data: await complaints.savePolicy(req.auth!.userId, req.auth!.institutionId, req.body),
    });
  }),
);

// Who may be assigned a complaint in this category. Feeds the assigner's picker so it never offers
// somebody who will be refused.
router.get(
  '/complaints/assignees',
  validate(idParamSchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await complaints.getEligibleAssignees(
        req.auth!.institutionId,
        String(req.query.id ?? ''),
      ),
    });
  }),
);

router.post(
  '/complaints',
  validate(complaintSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await complaints.registerComplaintFor(
        req.auth!.userId,
        req.auth!.institutionId,
        req.body,
      ),
    });
  }),
);

// Static-then-`:id`, in this order, and asserted individually by `verify-hostel/complaints.ts`.
router.get(
  '/complaints/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await complaints.getComplaint(req.auth!.institutionId, String(req.params.id)) });
  }),
);

router.post(
  '/complaints/:id/assign',
  validate(idParamSchema, 'params'),
  validate(complaintAssignSchema),
  wrap(async (req, res) => {
    res.json({
      data: await complaints.assignComplaint(
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
  '/complaints/:id/reopen',
  validate(idParamSchema, 'params'),
  validate(complaintReopenSchema),
  wrap(async (req, res) => {
    res.json({
      data: await complaints.reopenComplaint(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        req.body,
      ),
    });
  }),
);

// ── H-08 visitors ────────────────────────────────────────────────────────────────
//
// ROUTE ORDER IS LOAD-BEARING HERE, twice over.
//
//  1. Every static segment below (`/visitors/policy`, `/visitors/frequent`,
//     `/visitors/barred`) is declared BEFORE `/visitors/:id`. Declare them after and `:id`
//     swallows them - `/visitors/policy` then resolves as a visitor id and 404s a perfectly
//     valid request. This is the same trap as `/residents/facets` and `/rooms/:roomId`.
//
//  2. There is deliberately NO direct "check a visitor in" route any more. The old
//     `POST /visitors/checkin` created an on-campus row directly, with no authorisation and no
//     planned window - which is exactly what the approval workflow exists to prevent. Entry is
//     now `POST /visitors/:id/entry`, reachable only from `APPROVED`, and it re-checks the barred
//     list at the gate.
//
// CREATION is not warden-only in spirit: a warden may register a walk-in, but a resident's
// authorisation is what normally starts a visit. `POST /visitors` here always produces `PENDING`.

router.get(
  '/visitors/policy',
  wrap(async (req, res) => {
    res.json({ data: await visitors.getVisitorPolicy(req.auth!.institutionId) });
  }),
);

router.put(
  '/visitors/policy',
  validate(visitorPolicySchema),
  wrap(async (req, res) => {
    res.json({
      data: await visitors.updateVisitorPolicy(
        req.auth!.userId,
        req.auth!.institutionId,
        req.body,
      ),
    });
  }),
);

router.get(
  '/visitors/frequent',
  validate(frequentVisitorQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await visitors.frequentVisitors(req.auth!.institutionId, req.query as any),
    });
  }),
);

router.get(
  '/visitors/barred',
  wrap(async (req, res) => {
    res.json({ data: await visitors.listBarredVisitors(req.auth!.institutionId) });
  }),
);

router.post(
  '/visitors/barred',
  validate(barredVisitorSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await visitors.addBarredVisitor(
        req.auth!.userId,
        req.auth!.institutionId,
        req.body as any,
      ),
    });
  }),
);

router.delete(
  '/visitors/barred/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await visitors.removeBarredVisitor(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
      ),
    });
  }),
);

router.get(
  '/visitors',
  validate(visitorQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await visitors.listVisitors(req.auth!.institutionId, req.query as any),
    });
  }),
);

router.post(
  '/visitors',
  validate(visitorRegisterSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await visitors.registerVisitorByWarden(
        req.auth!.userId,
        req.auth!.institutionId,
        req.body as any,
      ),
    });
  }),
);

router.get(
  '/visitors/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await visitors.getVisitor(req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

router.post(
  '/visitors/:id/approve',
  validate(idParamSchema, 'params'),
  validate(visitorDecisionSchema),
  wrap(async (req, res) => {
    res.json({
      data: await visitors.decideVisitor(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        'APPROVED',
        req.body.note ?? null,
      ),
    });
  }),
);

router.post(
  '/visitors/:id/reject',
  validate(idParamSchema, 'params'),
  validate(visitorDecisionSchema),
  wrap(async (req, res) => {
    res.json({
      data: await visitors.decideVisitor(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        'REJECTED',
        req.body.note ?? null,
      ),
    });
  }),
);

router.post(
  '/visitors/:id/entry',
  validate(idParamSchema, 'params'),
  validate(visitorStampSchema),
  wrap(async (req, res) => {
    res.json({
      data: await visitors.recordVisitorEntry(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        req.body.at ?? null,
      ),
    });
  }),
);

router.post(
  '/visitors/:id/exit',
  validate(idParamSchema, 'params'),
  validate(visitorStampSchema),
  wrap(async (req, res) => {
    res.json({
      data: await visitors.recordVisitorExit(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        req.body.at ?? null,
      ),
    });
  }),
);

// H-10 notifications + broadcast + profile
router.get(
  '/notifications',
  wrap(async (req, res) => {
    res.json({ data: await service.listNotifications(req.auth!.userId, req.auth!.institutionId) });
  }),
);

router.post(
  '/notifications/read-all',
  wrap(async (req, res) => {
    res.json({ data: await service.markAllRead(req.auth!.userId, req.auth!.institutionId) });
  }),
);

router.post(
  '/broadcasts',
  validate(broadcastSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await service.createBroadcast(req.auth!.institutionId, req.auth!.userId, req.body),
    });
  }),
);

router.get(
  '/profile',
  wrap(async (req, res) => {
    res.json({ data: await service.getProfile(req.auth!.userId, req.auth!.institutionId) });
  }),
);

export default router;
