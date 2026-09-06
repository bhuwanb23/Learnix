import { Router } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  idParamSchema,
  tournamentQuerySchema,
  createFixtureSchema,
  resultSchema,
  addPlayerSchema,
  addEquipmentSchema,
  issueEquipmentSchema,
  bookVenueSchema,
  decisionSchema,
  scheduleItemSchema,
  scheduleItemDoneSchema,
  volunteerSchema,
  sportsBroadcastSchema,
} from './sports.schemas.js';
import * as service from './sports.service.js';

const router = Router();

// Express 5 route params are loosely typed — async wrapper + casts
const wrap =
  (fn: (req: any, res: any) => Promise<unknown>) =>
  (req: any, res: any, next: any) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('SPORTS', 'ADMIN'));

// SP-01 dashboard
router.get(
  '/dashboard',
  wrap(async (req, res) => {
    res.json({ data: await service.getDashboard(req.auth!.userId, req.auth!.institutionId) });
  }),
);

// SP-02 events
router.get(
  '/events',
  wrap(async (req, res) => {
    res.json({ data: await service.listEvents(req.auth!.institutionId) });
  }),
);

router.get(
  '/events/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.getEventDetail(req.auth!.userId, req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

router.post(
  '/registrations/:id/decide',
  validate(idParamSchema, 'params'),
  validate(decisionSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.decideRegistration(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        req.body.decision,
      ),
    });
  }),
);

router.post(
  '/events/:id/schedule',
  validate(idParamSchema, 'params'),
  validate(scheduleItemSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.addScheduleItem(req.auth!.userId, req.auth!.institutionId, String(req.params.id), req.body),
    });
  }),
);

router.post(
  '/schedule-items/:id/toggle',
  validate(idParamSchema, 'params'),
  validate(scheduleItemDoneSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.toggleScheduleItem(req.auth!.userId, req.auth!.institutionId, String(req.params.id), req.body.isDone),
    });
  }),
);

router.post(
  '/events/:id/volunteers',
  validate(idParamSchema, 'params'),
  validate(volunteerSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.addVolunteer(req.auth!.userId, req.auth!.institutionId, String(req.params.id), req.body),
    });
  }),
);

router.post(
  '/events/:id/announce',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.announceEvent(req.auth!.userId, req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

// SP-03 teams
router.get(
  '/teams',
  wrap(async (req, res) => {
    res.json({ data: await service.listTeams(req.auth!.institutionId) });
  }),
);

router.get(
  '/teams/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await service.getTeamDetail(req.auth!.institutionId, String(req.params.id)) });
  }),
);

router.post(
  '/teams/:id/players',
  validate(idParamSchema, 'params'),
  validate(addPlayerSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.addPlayer(req.auth!.userId, req.auth!.institutionId, String(req.params.id), req.body),
    });
  }),
);

// SP-04 tournaments
router.get(
  '/tournaments',
  validate(tournamentQuerySchema, 'query'),
  wrap(async (req, res) => {
    const sport = (req.query as { sport?: string }).sport;
    res.json({ data: await service.listTournaments(req.auth!.institutionId, sport) });
  }),
);

router.post(
  '/fixtures',
  validate(createFixtureSchema),
  wrap(async (req, res) => {
    res.json({ data: await service.scheduleFixture(req.auth!.userId, req.auth!.institutionId, req.body) });
  }),
);

router.post(
  '/fixtures/:id/result',
  validate(idParamSchema, 'params'),
  validate(resultSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.recordResult(req.auth!.userId, req.auth!.institutionId, String(req.params.id), req.body),
    });
  }),
);

// SP-05 equipment
router.get(
  '/equipment',
  wrap(async (req, res) => {
    res.json({ data: await service.listEquipment(req.auth!.institutionId) });
  }),
);

router.post(
  '/equipment',
  validate(addEquipmentSchema),
  wrap(async (req, res) => {
    res.json({ data: await service.addEquipment(req.auth!.userId, req.auth!.institutionId, req.body) });
  }),
);

router.post(
  '/equipment/issue',
  validate(issueEquipmentSchema),
  wrap(async (req, res) => {
    res.json({ data: await service.issueEquipment(req.auth!.userId, req.auth!.institutionId, req.body) });
  }),
);

router.post(
  '/equipment-issues/:id/return',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.returnEquipment(req.auth!.userId, req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

// SP-06 venues
router.get(
  '/venues',
  wrap(async (req, res) => {
    res.json({ data: await service.listVenues(req.auth!.institutionId) });
  }),
);

router.post(
  '/venue-bookings/:id/decide',
  validate(idParamSchema, 'params'),
  validate(decisionSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.decideVenueBooking(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        req.body.decision,
      ),
    });
  }),
);

router.post(
  '/venue-bookings',
  validate(bookVenueSchema),
  wrap(async (req, res) => {
    res.json({ data: await service.bookVenue(req.auth!.userId, req.auth!.institutionId, req.body) });
  }),
);

// SP-07 notifications + broadcast
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
  validate(sportsBroadcastSchema),
  wrap(async (req, res) => {
    res.json({ data: await service.createBroadcast(req.auth!.userId, req.auth!.institutionId, req.body) });
  }),
);

// SP-08 profile
router.get(
  '/profile',
  wrap(async (req, res) => {
    res.json({ data: await service.getProfile(req.auth!.userId, req.auth!.institutionId) });
  }),
);

export default router;
