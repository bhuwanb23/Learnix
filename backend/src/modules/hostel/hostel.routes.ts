import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  idParamSchema,
  bedParamSchema,
  allocateSchema,
  menuSchema,
  complaintSchema,
  visitorCheckinSchema,
  broadcastSchema,
  residentQuerySchema,
  contactSchema,
  roomQuerySchema,
  roomIdParamSchema,
  bedMaintenanceSchema,
  gatePassQuerySchema,
  gatePassDecisionSchema,
  gatePassStampSchema,
} from './hostel.schemas.js';
import * as service from './hostel.service.js';
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

// H-05 mess
router.get(
  '/mess',
  wrap(async (req, res) => {
    res.json({ data: await service.getMess(req.auth!.institutionId) });
  }),
);

router.put(
  '/mess/menu',
  validate(menuSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.upsertMenuItem(req.auth!.userId, req.auth!.institutionId, req.body),
    });
  }),
);

router.post(
  '/mess/survey',
  wrap(async (req, res) => {
    res.json({ data: await service.sendMessSurvey(req.auth!.userId, req.auth!.institutionId) });
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

// H-07 complaints
router.get(
  '/complaints',
  wrap(async (req, res) => {
    res.json({ data: await service.listComplaints(req.auth!.institutionId) });
  }),
);

router.post(
  '/complaints',
  validate(complaintSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await service.createComplaint(req.auth!.userId, req.auth!.institutionId, req.body),
    });
  }),
);

router.post(
  '/complaints/:id/assign',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.assignComplaint(req.auth!.userId, req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

router.post(
  '/complaints/:id/resolve',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.resolveComplaint(req.auth!.userId, req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

// H-08 visitors
router.get(
  '/visitors',
  wrap(async (req, res) => {
    res.json({ data: await service.listVisitors(req.auth!.institutionId) });
  }),
);

router.post(
  '/visitors/checkin',
  validate(visitorCheckinSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await service.checkInVisitor(req.auth!.userId, req.auth!.institutionId, req.body),
    });
  }),
);

router.post(
  '/visitors/:id/checkout',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.checkOutVisitor(req.auth!.userId, req.auth!.institutionId, String(req.params.id)),
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
