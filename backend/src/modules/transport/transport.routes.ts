import { Router } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  idParamSchema,
  createRouteSchema,
  addStopSchema,
  enrollStudentSchema,
  pingSchema,
  recordServiceSchema,
  completeServiceSchema,
  fuelLogSchema,
  collectFeeSchema,
  feeRevisionSchema,
  dutySchema,
  transportBroadcastSchema,
} from './transport.schemas.js';
import * as service from './transport.service.js';

const router = Router();

// Express 5 route params are loosely typed — async wrapper + casts
const wrap =
  (fn: (req: any, res: any) => Promise<unknown>) =>
  (req: any, res: any, next: any) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('TRANSPORT', 'ADMIN'));

// R-01 dashboard
router.get(
  '/dashboard',
  wrap(async (req, res) => {
    res.json({ data: await service.getDashboard(req.auth!.userId, req.auth!.institutionId) });
  }),
);

// R-02 routes
router.get(
  '/routes',
  wrap(async (req, res) => {
    res.json({ data: await service.listRoutes(req.auth!.institutionId) });
  }),
);

router.get(
  '/routes/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await service.getRouteDetail(req.auth!.institutionId, String(req.params.id)) });
  }),
);

router.post(
  '/routes',
  validate(createRouteSchema),
  wrap(async (req, res) => {
    res.json({ data: await service.createRoute(req.auth!.userId, req.auth!.institutionId, req.body) });
  }),
);

router.post(
  '/routes/:id/stops',
  validate(idParamSchema, 'params'),
  validate(addStopSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.addStop(req.auth!.userId, req.auth!.institutionId, String(req.params.id), req.body),
    });
  }),
);

router.post(
  '/routes/:id/enroll',
  validate(idParamSchema, 'params'),
  validate(enrollStudentSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.enrollStudent(req.auth!.userId, req.auth!.institutionId, String(req.params.id), req.body),
    });
  }),
);

router.post(
  '/enrollments/:id/remove',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.removeEnrollment(req.auth!.userId, req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

// R-03 fleet
router.get(
  '/fleet',
  wrap(async (req, res) => {
    res.json({ data: await service.listFleet(req.auth!.institutionId) });
  }),
);

router.get(
  '/fleet/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await service.getVehicleDetail(req.auth!.institutionId, String(req.params.id)) });
  }),
);

router.post(
  '/fleet/:id/service',
  validate(idParamSchema, 'params'),
  validate(recordServiceSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.recordService(req.auth!.userId, req.auth!.institutionId, String(req.params.id), req.body),
    });
  }),
);

router.post(
  '/fleet/:id/fuel',
  validate(idParamSchema, 'params'),
  validate(fuelLogSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.addFuelLog(req.auth!.userId, req.auth!.institutionId, String(req.params.id), req.body),
    });
  }),
);

router.post(
  '/service-records/:id/complete',
  validate(idParamSchema, 'params'),
  validate(completeServiceSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.completeService(
        req.auth!.userId,
        req.auth!.institutionId,
        String(req.params.id),
        req.body.odometerKm,
      ),
    });
  }),
);

// R-04 drivers
router.get(
  '/drivers',
  wrap(async (req, res) => {
    res.json({ data: await service.listDrivers(req.auth!.institutionId) });
  }),
);

router.post(
  '/drivers/:id/duty',
  validate(idParamSchema, 'params'),
  validate(dutySchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.setDutyStatus(req.auth!.userId, req.auth!.institutionId, String(req.params.id), req.body.dutyStatus),
    });
  }),
);

// R-06 live tracking
router.get(
  '/tracking',
  wrap(async (req, res) => {
    res.json({ data: await service.getTracking(req.auth!.institutionId) });
  }),
);

router.post(
  '/vehicles/:id/ping',
  validate(idParamSchema, 'params'),
  validate(pingSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.pingBus(req.auth!.userId, req.auth!.institutionId, String(req.params.id), req.body),
    });
  }),
);

// R-07 maintenance
router.get(
  '/maintenance',
  wrap(async (req, res) => {
    res.json({ data: await service.getMaintenance(req.auth!.institutionId) });
  }),
);

// R-08 fees
router.get(
  '/fees',
  wrap(async (req, res) => {
    res.json({ data: await service.listFees(req.auth!.institutionId) });
  }),
);

router.post(
  '/fees/:id/remind',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.remindDue(req.auth!.userId, req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

router.post(
  '/fees/:id/collect',
  validate(idParamSchema, 'params'),
  validate(collectFeeSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.collectFee(req.auth!.userId, req.auth!.institutionId, String(req.params.id), req.body.method),
    });
  }),
);

router.post(
  '/fee-structure/revision',
  validate(feeRevisionSchema),
  wrap(async (req, res) => {
    res.json({ data: await service.requestFeeRevision(req.auth!.userId, req.auth!.institutionId, req.body) });
  }),
);

// R-09 notifications + broadcast
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
  validate(transportBroadcastSchema),
  wrap(async (req, res) => {
    res.json({ data: await service.createBroadcast(req.auth!.userId, req.auth!.institutionId, req.body) });
  }),
);

// R-09 profile
router.get(
  '/profile',
  wrap(async (req, res) => {
    res.json({ data: await service.getProfile(req.auth!.userId, req.auth!.institutionId) });
  }),
);

export default router;
