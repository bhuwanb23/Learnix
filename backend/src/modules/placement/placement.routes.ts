import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  idParamSchema,
  addCompanySchema,
  postJobSchema,
  createDriveSchema,
  decideApplicationSchema,
  extendOfferSchema,
  decideOfferSchema,
  placementBroadcastSchema,
} from './placement.schemas.js';
import * as service from './placement.service.js';

// Placement Cell module — mounted at /api/v1/placement (docs/users/04 §4)
const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('PLACEMENT', 'ADMIN'));

// P-01 dashboard
router.get(
  '/dashboard',
  wrap(async (req, res) => {
    res.json({ data: await service.getDashboard(req.auth!.institutionId) });
  }),
);

// P-02 companies
router.get(
  '/companies',
  wrap(async (req, res) => {
    res.json({ data: await service.listCompanies(req.auth!.institutionId) });
  }),
);

router.post(
  '/companies',
  validate(addCompanySchema),
  wrap(async (req, res) => {
    res.status(201).json({ data: await service.addCompany(req.auth!.institutionId, req.auth!.userId, req.body) });
  }),
);

router.put(
  '/companies/:id',
  validate(idParamSchema, 'params'),
  validate(addCompanySchema.partial()),
  wrap(async (req, res) => {
    res.json({ data: await service.updateCompany(req.auth!.institutionId, req.auth!.userId, String(req.params.id), req.body) });
  }),
);

// P-03 jobs
router.get(
  '/jobs',
  wrap(async (req, res) => {
    res.json({ data: await service.listJobs(req.auth!.institutionId) });
  }),
);

router.post(
  '/jobs',
  validate(postJobSchema),
  wrap(async (req, res) => {
    res.status(201).json({ data: await service.postJob(req.auth!.institutionId, req.auth!.userId, req.body) });
  }),
);

router.post(
  '/jobs/:id/close',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await service.closeJob(req.auth!.institutionId, req.auth!.userId, String(req.params.id)) });
  }),
);

// P-04 drives
router.get(
  '/drives',
  wrap(async (req, res) => {
    res.json({ data: await service.listDrives(req.auth!.institutionId) });
  }),
);

router.post(
  '/drives',
  validate(createDriveSchema),
  wrap(async (req, res) => {
    res.status(201).json({ data: await service.createDrive(req.auth!.institutionId, req.auth!.userId, req.body) });
  }),
);

router.post(
  '/drives/:id/submit',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await service.submitDriveForApproval(req.auth!.institutionId, req.auth!.userId, String(req.params.id)) });
  }),
);

// P-05 applications
router.get(
  '/applications',
  wrap(async (req, res) => {
    const driveId = req.query.driveId as string | undefined;
    const status = req.query.status as string | undefined;
    res.json({ data: await service.listApplications(req.auth!.institutionId, driveId, status) });
  }),
);

router.post(
  '/applications/:id/decide',
  validate(idParamSchema, 'params'),
  validate(decideApplicationSchema),
  wrap(async (req, res) => {
    res.json({ data: await service.decideApplication(req.auth!.institutionId, req.auth!.userId, String(req.params.id), req.body.decision) });
  }),
);

// P-06 offers
router.post(
  '/offers/extend',
  validate(extendOfferSchema),
  wrap(async (req, res) => {
    res.status(201).json({ data: await service.extendOffer(req.auth!.institutionId, req.auth!.userId, req.body.applicationId, req.body.ctcMinor) });
  }),
);

router.post(
  '/offers/:id/decide',
  validate(idParamSchema, 'params'),
  validate(decideOfferSchema),
  wrap(async (req, res) => {
    res.json({ data: await service.decideOffer(req.auth!.institutionId, req.auth!.userId, String(req.params.id), req.body.decision) });
  }),
);

// P-07 eligible students
router.get(
  '/students',
  wrap(async (req, res) => {
    res.json({ data: await service.listEligibleStudents(req.auth!.institutionId) });
  }),
);

// P-08 notifications + broadcast + profile
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
  validate(placementBroadcastSchema),
  wrap(async (req, res) => {
    res.status(201).json({ data: await service.createBroadcast(req.auth!.institutionId, req.auth!.userId, req.body) });
  }),
);

router.get(
  '/profile',
  wrap(async (req, res) => {
    res.json({ data: await service.getProfile(req.auth!.userId, req.auth!.institutionId) });
  }),
);

export default router;
