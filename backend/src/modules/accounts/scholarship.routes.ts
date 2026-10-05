// F-08 Scholarships routes — mounted at /api/v1/accounts (docs/users/06 §3.7).
//
// Its own file for the same reason expenses/feestructure/payroll-structure have
// one: the LITERAL sub-resource paths here (`/scholarships/catalogue`,
// `/scholarships/applications`, `/scholarships/tracking`, …) MUST be registered
// before `/scholarships/:id`. Registered second, "applications" is read as a
// scheme id and a working screen 404s.
import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { unprocessable } from '../../lib/errors.js';
import { prisma } from '../../db/prisma.js';
import {
  applyScholarshipSchema,
  disburseScholarshipSchema,
  rejectScholarshipSchema,
  saveScholarshipSchema,
  scholarshipAppParamSchema,
  scholarshipApplicationsQuerySchema,
  scholarshipDocumentParamSchema,
  scholarshipDocumentSchema,
  scholarshipIdParamSchema,
  scholarshipListQuerySchema,
  scholarshipNoteSchema,
  scholarshipPreviewParamSchema,
  scholarshipStudentParamSchema,
} from './accounts.schemas.js';
import {
  DOCUMENT_CATALOG,
  DOCUMENT_CODES,
  DISBURSEMENT_META,
  ELIGIBILITY_OPERATORS,
  OPERATOR_META,
  SCHOLARSHIP_TYPES,
  SCHOLARSHIP_TYPE_META,
  STATUS_META,
  TRANSITIONS,
  documentMeta,
  suggestedDocuments,
} from './scholarship.rules.js';
import * as desk from './scholarship.service.js';
import * as write_ from './scholarship.desk.js';
import * as disburse from './scholarship.disburse.js';
import { UPLOAD_DIR } from './expenses.routes.js';

const router = Router();

// Mounted BEFORE accountsRoutes (so its literal paths are not read as a scheme
// id), which means it can no longer rely on accountsRoutes having applied the
// middleware. Without this line every handler would throw on `req.auth!` with a
// 500 instead of returning a 401.
router.use(auth, requireRole('ACCOUNTS', 'ADMIN'));

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: (e?: unknown) => void) => {
    fn(req, res).catch(next);
  };

// ── Document upload ────────────────────────────────────────────────────────
// A student's income proof is a real scan, so it is a real `File` row the desk
// can open. Same shape as the expense-receipt upload: random stored name, an
// allow-list of mime types, a size cap. The client's filename is never used as
// the stored name — it is attacker-controlled and can contain path separators.
const DOC_UPLOAD_DIR = path.join(UPLOAD_DIR, 'scholarships');
fs.mkdirSync(DOC_UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, DOC_UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 10).replace(/[^.\w]/g, '') || '.bin';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(unprocessable(`A document must be a JPEG, PNG, WebP, HEIC or PDF — got ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});

// ── Literal routes (before /scholarships/:id) ──────────────────────────────

/** Everything the app needs to render a scheme form without hard-coding it. */
router.get(
  '/scholarships/catalogue',
  wrap(async (_req, res) => {
    res.json({
      data: {
        types: SCHOLARSHIP_TYPES.map((t) => ({ type: t, ...SCHOLARSHIP_TYPE_META[t] })),
        operators: ELIGIBILITY_OPERATORS.map((o) => ({ operator: o, ...OPERATOR_META[o] })),
        documents: DOCUMENT_CODES.map((c) => ({ ...DOCUMENT_CATALOG[c], ...documentMeta(c) })),
        suggestedDocuments: Object.fromEntries(SCHOLARSHIP_TYPES.map((t) => [t, suggestedDocuments(t)])),
        statuses: Object.keys(STATUS_META).map((s) => ({ status: s, ...STATUS_META[s as keyof typeof STATUS_META] })),
        disbursementBands: Object.entries(DISBURSEMENT_META).map(([band, m]) => ({ band, ...m })),
        transitions: TRANSITIONS,
        amountModes: desk.AMOUNT_MODE_META,
      },
    });
  }),
);

router.get(
  '/scholarships/applications',
  validate(scholarshipApplicationsQuerySchema, 'query'),
  wrap(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    res.json({
      data: await desk.listApplications(req.auth!.institutionId, {
        status: q.status && q.status !== 'ALL' ? q.status : undefined,
        schemeId: q.schemeId,
        studentProfileId: q.studentProfileId,
        q: q.q,
      }),
    });
  }),
);

router.post(
  '/scholarships/applications',
  validate(applyScholarshipSchema, 'body'),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await write_.applyToScheme(req.auth!.institutionId, req.auth!.userId, req.body as never),
    });
  }),
);

router.get(
  '/scholarships/tracking',
  wrap(async (req, res) => {
    res.json({ data: await disburse.amountTracking(req.auth!.institutionId) });
  }),
);

router.get(
  '/scholarships/students/:studentProfileId/history',
  validate(scholarshipStudentParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await disburse.studentHistory(req.auth!.institutionId, String(req.params.studentProfileId)),
    });
  }),
);

router.get(
  '/scholarships',
  validate(scholarshipListQuerySchema, 'query'),
  wrap(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    res.json({
      data: await desk.listSchemes(req.auth!.institutionId, {
        status: q.status && q.status !== 'ALL' ? q.status : undefined,
        type: q.type,
        q: q.q,
      }),
    });
  }),
);

router.post(
  '/scholarships',
  validate(saveScholarshipSchema, 'body'),
  wrap(async (req, res) => {
    res.status(201).json({ data: await desk.saveScheme(req.auth!.institutionId, req.auth!.userId, req.body as never) });
  }),
);

// ── One application ────────────────────────────────────────────────────────

router.get(
  '/scholarships/applications/:id',
  validate(scholarshipAppParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await desk.getApplication(req.auth!.institutionId, String(req.params.id)) });
  }),
);

router.post(
  '/scholarships/applications/:id/review',
  validate(scholarshipAppParamSchema, 'params'),
  validate(scholarshipNoteSchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await write_.startReview(req.auth!.institutionId, req.auth!.userId, String(req.params.id), req.body.note),
    });
  }),
);

router.post(
  '/scholarships/applications/:id/approve',
  validate(scholarshipAppParamSchema, 'params'),
  validate(scholarshipNoteSchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await write_.approveApplication(req.auth!.institutionId, req.auth!.userId, String(req.params.id), req.body.note),
    });
  }),
);

router.post(
  '/scholarships/applications/:id/reject',
  validate(scholarshipAppParamSchema, 'params'),
  validate(rejectScholarshipSchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await write_.rejectApplication(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        String(req.body.reason),
      ),
    });
  }),
);

router.post(
  '/scholarships/applications/:id/withdraw',
  validate(scholarshipAppParamSchema, 'params'),
  validate(scholarshipNoteSchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await write_.withdrawApplication(req.auth!.institutionId, req.auth!.userId, String(req.params.id), req.body.note),
    });
  }),
);

router.post(
  '/scholarships/applications/:id/disburse',
  validate(scholarshipAppParamSchema, 'params'),
  validate(disburseScholarshipSchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await disburse.disburseApplication(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        { amountRupees: req.body.amountRupees, note: req.body.note },
      ),
    });
  }),
);

router.post(
  '/scholarships/applications/:id/reverse',
  validate(scholarshipAppParamSchema, 'params'),
  validate(rejectScholarshipSchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await disburse.reverseDisbursement(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        String(req.body.reason),
      ),
    });
  }),
);

// ── Required-document tracking ─────────────────────────────────────────────

router.post(
  '/scholarships/applications/:id/documents/:code',
  validate(scholarshipDocumentParamSchema, 'params'),
  validate(scholarshipDocumentSchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await write_.recordDocument(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        String(req.params.code),
        req.body as never,
      ),
    });
  }),
);

router.post(
  '/scholarships/applications/:id/documents/:code/upload',
  validate(scholarshipDocumentParamSchema, 'params'),
  upload.single('file'),
  wrap(async (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(422).json({ error: { code: 'NO_FILE', message: 'Attach a file under the `file` field' } });
      return;
    }
    const institutionId = req.auth!.institutionId;

    // The File row is written first: a failed attach then leaves an orphan file
    // (invisible, harmless) rather than a document pointing at nothing.
    const created = await prisma.file.create({
      data: {
        institutionId,
        uploaderUserId: req.auth!.userId,
        purpose: 'SUBMISSION',
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey: `scholarships/${file.filename}`,
        originalName: file.originalname,
      },
    });

    try {
      const result = await write_.uploadDocument(institutionId, req.auth!.userId, String(req.params.id), String(req.params.code), {
        id: created.id,
        originalName: created.originalName,
      });
      res.status(201).json({
        data: {
          ...result,
          file: { id: created.id, name: created.originalName, sizeBytes: created.sizeBytes, mimeType: created.mimeType, url: `/uploads/${created.storageKey}` },
        },
      });
    } catch (err) {
      await prisma.file.delete({ where: { id: created.id } }).catch(() => undefined);
      fs.promises.unlink(path.join(UPLOAD_DIR, created.storageKey)).catch(() => undefined);
      throw err;
    }
  }),
);

// ── One scheme ─────────────────────────────────────────────────────────────

router.get(
  '/scholarships/:id',
  validate(scholarshipIdParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await desk.getScheme(req.auth!.institutionId, String(req.params.id)) });
  }),
);

router.put(
  '/scholarships/:id',
  validate(scholarshipIdParamSchema, 'params'),
  validate(saveScholarshipSchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await desk.saveScheme(req.auth!.institutionId, req.auth!.userId, {
        ...(req.body as object),
        id: String(req.params.id),
      } as never),
    });
  }),
);

/** Preview what a named student would be granted from this scheme, live. */
router.get(
  '/scholarships/:id/preview/:studentProfileId',
  validate(scholarshipPreviewParamSchema, 'params'),
  wrap(async (req, res) => {
    const scheme = await desk.getScheme(req.auth!.institutionId, String(req.params.id));
    const preview = await desk.amountPreviewFor(
      req.auth!.institutionId,
      {
        id: scheme.id,
        amountMode: scheme.amountMode,
        awardPercent: scheme.awardPercent,
        fixedAmountMinor: scheme.fixedAmountRupees * 100,
        budgetMinor: scheme.budgetRupees === null ? null : scheme.budgetRupees * 100,
        capacity: scheme.capacity,
      },
      String(req.params.studentProfileId),
    );
    const facts = await desk.eligibilityFactsFor(String(req.params.studentProfileId));
    const { evaluateEligibility } = await import('./scholarship.rules.js');
    res.json({
      data: {
        amount: { ...preview, outstandingRupees: Math.round(preview.outstandingMinor / 100), grantedRupees: Math.round(preview.grantedMinor / 100), requestedRupees: Math.round(preview.requestedMinor / 100) },
        eligibility: evaluateEligibility(scheme.rules, facts),
      },
    });
  }),
);

export default router;