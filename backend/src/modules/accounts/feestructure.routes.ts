// Fee structure routes — mounted at /api/v1/accounts (docs/users/06 §3.5).
//
// Its own file for the same reason `expenses.routes.ts` has one: the literal
// sub-resource routes here (`/fee-structures/:id/versions`,
// `.../concessions`, `.../installments`, `.../resolve`) must be registered BEFORE
// `/fee-structures/:id`. In a single 800-line router that ordering is invisible,
// and a param route registered first reads "versions" as a structure id and 404s
// a perfectly good screen — the exact bug the dues desk already had to be taught
// twice.
import { Router, type Request, type Response } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  idParamSchema,
  versionParamSchema,
  concessionParamSchema,
  feeStructureQuerySchema,
  feeStructureDetailQuerySchema,
  createFeeStructureSchema,
  replaceComponentsSchema,
  versionDraftSchema,
  publishVersionSchema,
  concessionSchema,
  concessionPreviewSchema,
  installmentConfigSchema,
  effectiveDateQuerySchema,
} from './accounts.schemas.js';
import * as fs from './feestructure.service.js';

const router = Router();

// Own auth, same reason as the payroll salary desk: this router is mounted as a
// sibling of `accountsRoutes`, and anything that reorders those mounts must not
// silently leave this one unauthenticated.
router.use(auth, requireRole('ACCOUNTS', 'ADMIN'));

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: (e?: unknown) => void) => {
    fn(req, res).catch(next);
  };

// ── Collection ──────────────────────────────────────────────
router.get(
  '/fee-structures',
  validate(feeStructureQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await fs.listStructures(req.auth!.institutionId, {
        q: req.query.q ? String(req.query.q) : undefined,
        programId: req.query.programId ? String(req.query.programId) : undefined,
        academicYearId: req.query.academicYearId ? String(req.query.academicYearId) : undefined,
        status: req.query.status as never,
        sort: req.query.sort as never,
      }),
    });
  }),
);

router.post(
  '/fee-structures',
  validate(createFeeStructureSchema, 'body'),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await fs.createStructure(req.auth!.institutionId, req.auth!.userId, req.body as never),
    });
  }),
);

// ── Literal sub-resources, BEFORE /:id ───────────────────────
router.get(
  '/fee-structures/:id/versions',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await fs.listVersions(req.auth!.institutionId, String(req.params.id)) });
  }),
);

router.post(
  '/fee-structures/:id/versions',
  validate(idParamSchema, 'params'),
  validate(versionDraftSchema, 'body'),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await fs.createDraftVersion(req.auth!.institutionId, req.auth!.userId, String(req.params.id), req.body ?? {}),
    });
  }),
);

router.post(
  '/fee-structures/:id/versions/:versionId/publish',
  validate(versionParamSchema, 'params'),
  validate(publishVersionSchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await fs.publishVersion(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        String(req.params.versionId),
        req.body ?? {},
      ),
    });
  }),
);

router.post(
  '/fee-structures/:id/versions/:versionId/discard',
  validate(versionParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await fs.discardDraftVersion(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        String(req.params.versionId),
      ),
    });
  }),
);

router.get(
  '/fee-structures/:id/concessions',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const detail = await fs.getStructure(req.auth!.institutionId, String(req.params.id));
    res.json({
      data: {
        structureId: detail.id,
        totalRupees: detail.totalRupees,
        items: detail.concessions,
        summary: detail.concessionSummary,
      },
    });
  }),
);

router.post(
  '/fee-structures/:id/concessions',
  validate(idParamSchema, 'params'),
  validate(concessionSchema, 'body'),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await fs.saveConcession(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body as never,
      ),
    });
  }),
);

router.put(
  '/fee-structures/:id/concessions/:concessionId',
  validate(concessionParamSchema, 'params'),
  validate(concessionSchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await fs.saveConcession(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        { ...(req.body as Record<string, unknown>), id: String(req.params.concessionId) } as never,
      ),
    });
  }),
);

router.delete(
  '/fee-structures/:id/concessions/:concessionId',
  validate(concessionParamSchema, 'params'),
  wrap(async (req, res) => {
    const row = await fs.deleteConcession(req.auth!.institutionId, req.auth!.userId, String(req.params.concessionId));
    res.json({ data: row });
  }),
);

router.post(
  '/fee-structures/:id/concessions/preview',
  validate(idParamSchema, 'params'),
  validate(concessionPreviewSchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await fs.previewConcessions(req.auth!.institutionId, String(req.params.id), req.body ?? {}),
    });
  }),
);

router.put(
  '/fee-structures/:id/installments',
  validate(idParamSchema, 'params'),
  validate(installmentConfigSchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await fs.saveInstallments(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body as never,
      ),
    });
  }),
);

router.get(
  '/fee-structures/:id/resolve',
  validate(idParamSchema, 'params'),
  validate(effectiveDateQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await fs.resolveOnDate(req.auth!.institutionId, String(req.params.id), {
        onDate: req.query.onDate ? String(req.query.onDate) : undefined,
        semester: req.query.semester !== undefined ? Number(req.query.semester) : undefined,
      }),
    });
  }),
);

router.put(
  '/fee-structures/:id/components',
  validate(idParamSchema, 'params'),
  validate(replaceComponentsSchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await fs.replaceComponents(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body as never,
      ),
    });
  }),
);

// ── Single structure — AFTER every literal sub-resource ────
router.get(
  '/fee-structures/:id',
  validate(idParamSchema, 'params'),
  validate(feeStructureDetailQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await fs.getStructure(req.auth!.institutionId, String(req.params.id), {
        onDate: req.query.onDate ? String(req.query.onDate) : undefined,
      }),
    });
  }),
);

// Legacy singular alias kept so the transport module and any older client keep
// working. New screens use /fee-structures.
router.get(
  '/fee-structure',
  validate(feeStructureQuerySchema, 'query'),
  wrap(async (req, res) => {
    const out = await fs.listStructures(req.auth!.institutionId, {
      q: req.query.q ? String(req.query.q) : undefined,
      status: req.query.status as never,
    });
    res.json({
      data: out.items.map((s) => ({
        id: s.id,
        program: s.program,
        programCode: s.programCode,
        academicYear: s.academicYear,
        tuitionRupees: s.tuitionRupees,
        otherRupees: s.otherRupees,
        totalRupees: s.totalRupees,
        status: s.status,
      })),
    });
  }),
);

router.post(
  '/fee-structure/:id/revision',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await fs.requestRevision(req.auth!.institutionId, req.auth!.userId, String(req.params.id)),
    });
  }),
);

export default router;