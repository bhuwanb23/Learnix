import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  createInstitutionSchema,
  createAcademicYearSchema,
  setRolePermissionSchema,
  platformBroadcastSchema,
  idParamSchema,
} from './platform.schemas.js';
import * as service from './platform.service.js';

// Platform module — mounted at /api/v1/platform (docs/backend/07 §Platform & shared)
const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('PLATFORM_ADMIN'));

// X-03 — institutions
router.get(
  '/institutions',
  wrap(async (_req, res) => {
    res.json({ data: await service.listInstitutions() });
  }),
);

router.post(
  '/institutions',
  validate(createInstitutionSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await service.createInstitution(req.auth!.userId, req.body),
    });
  }),
);

// X-04 — master data (header selects the institution context, per ADR-05)
router.get(
  '/institutions/:id/master-data',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.getMasterData(String(req.params.id)),
    });
  }),
);

router.post(
  '/institutions/:id/academic-years',
  validate(idParamSchema, 'params'),
  validate(createAcademicYearSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.createAcademicYear(String(req.params.id), req.auth!.userId, req.body),
    });
  }),
);

// X-09 — config + feature flags
router.get(
  '/institutions/:id/config',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await service.getConfig(String(req.params.id)) });
  }),
);

// X-10 — RBAC
router.get(
  '/institutions/:id/rbac',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await service.getRbac(String(req.params.id)) });
  }),
);

router.put(
  '/institutions/:id/rbac/role-permissions',
  validate(idParamSchema, 'params'),
  validate(setRolePermissionSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.setRolePermissions(String(req.params.id), req.auth!.userId, req.body),
    });
  }),
);

// X-07/X-08 — files + audit oversight
router.get(
  '/institutions/:id/files',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await service.listFiles(String(req.params.id)) });
  }),
);

router.get(
  '/institutions/:id/audit-logs',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await service.listAuditLogs(String(req.params.id)) });
  }),
);

// Platform broadcasts
router.post(
  '/institutions/:id/broadcasts',
  validate(idParamSchema, 'params'),
  validate(platformBroadcastSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await service.createBroadcast(String(req.params.id), req.auth!.userId, req.body),
    });
  }),
);

export default router;
