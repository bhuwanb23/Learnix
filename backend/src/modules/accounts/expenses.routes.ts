// Expenses routes — mounted at /api/v1/accounts (docs/users/06 §3.6).
//
// Kept in its own file rather than appended to `accounts.routes.ts` because the
// literal routes here (`/expenses/budgets`, `/expenses/trends`, `/expenses/vendors`,
// `/expenses/departments`) must all be registered BEFORE `/expenses/:id`. In one
// 700-line file that ordering is invisible; in a 200-line one it is the first
// thing you read. Register the param route first and "budgets" is read as an
// expense id and 404s a perfectly good screen — the exact bug the dues desk
// already had to be taught twice.
import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { prisma } from '../../db/prisma.js';
import { validate } from '../../middlewares/validate.js';
import { badRequest, unprocessable } from '../../lib/errors.js';
import {
  idParamSchema,
  expenseListQuerySchema,
  addExpenseSchema,
  expenseDecisionSchema,
  budgetLineSchema,
  budgetListQuerySchema,
  trendQuerySchema,
  departmentQuerySchema,
  vendorQuerySchema,
} from './accounts.schemas.js';
import * as expenses from './expenses.service.js';
import { toRupees } from './expenses.money.js';

const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: (e?: unknown) => void) => {
    fn(req, res).catch(next);
  };

// ── Receipt upload ──────────────────────────────────────────
// Documents are stored on disk under UPLOAD_DIR and referenced by a unique
// `storageKey`, which is exactly the shape `File.storageKey` already describes.
// Swapping this for S3 later is a change to these fifteen lines, not to the
// service, the schema or the app.
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic',
  'application/pdf',
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    // The stored name is random and extension-derived — never the client's
    // filename, which is attacker-controlled and could contain path separators.
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 10).replace(/[^.\w]/g, '') || '.bin';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(unprocessable(`A receipt must be a JPEG, PNG, WebP, HEIC or PDF — got ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});

// ── Literal routes (before /:id) ────────────────────────────

router.get(
  '/expenses',
  validate(expenseListQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await expenses.listExpenses(req.auth!.institutionId, {
        status: req.query.status as string,
        category: req.query.category as string,
        departmentId: req.query.departmentId as string,
        vendor: req.query.vendor as string,
        q: req.query.q as string,
        month: req.query.month as string,
        fiscalYear: req.query.fiscalYear as string,
        missingReceipt: req.query.missingReceipt === 'true',
        take: req.query.take ? Number(req.query.take) : undefined,
        skip: req.query.skip ? Number(req.query.skip) : undefined,
      }),
    });
  }),
);

router.post(
  '/expenses',
  validate(addExpenseSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await expenses.createExpense(req.auth!.institutionId, req.auth!.userId, req.body),
    });
  }),
);

router.get(
  '/expenses/budgets',
  validate(budgetListQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await expenses.listBudgets(
        req.auth!.institutionId,
        req.query.fiscalYear as string | undefined,
      ),
    });
  }),
);

router.post(
  '/expenses/budgets',
  validate(budgetLineSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await expenses.saveBudget(req.auth!.institutionId, req.auth!.userId, req.body),
    });
  }),
);

router.post(
  '/expenses/budgets/reconcile',
  validate(budgetListQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await expenses.reconcileBudgets(
        req.auth!.institutionId,
        req.query.fiscalYear as string | undefined,
      ),
    });
  }),
);

router.get(
  '/expenses/trends',
  validate(trendQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await expenses.monthlyTrend(
        req.auth!.institutionId,
        req.query.months ? Number(req.query.months) : 12,
        req.query.category as string | undefined,
      ),
    });
  }),
);

router.get(
  '/expenses/departments',
  validate(departmentQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await expenses.departmentSpend(
        req.auth!.institutionId,
        req.query.fiscalYear as string | undefined,
      ),
    });
  }),
);

router.get(
  '/expenses/vendors',
  validate(vendorQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await expenses.vendorSpend(
        req.auth!.institutionId,
        req.query.fiscalYear as string | undefined,
      ),
    });
  }),
);

// ── Documents ──────────────────────────────────────────────

// Multipart, so it is the one expense route that does not go through the JSON
// body validator. It still authenticates: `requireAuth` is mounted above the
// whole accounts router, so an anonymous upload never reaches this handler.
router.post(
  '/expenses/:id/documents',
  validate(idParamSchema, 'params'),
  upload.single('file'),
  wrap(async (req, res) => {
    const file = req.file;
    if (!file) throw badRequest('No file was uploaded — send it as multipart/form-data under "file"');
    if (req.body.kind && !expenses.DOC_KIND_IDS.includes(req.body.kind)) {
      throw badRequest(`Document kind must be one of ${expenses.DOC_KIND_IDS.join(', ')}`);
    }

    const institutionId = req.auth!.institutionId;

    // The File row is written first so a failed attach leaves an orphan file
    // (invisible, harmless) rather than a document pointing at nothing.
    const created = await prisma.file.create({
      data: {
        institutionId,
        uploaderUserId: req.auth!.userId,
        purpose: 'EXPENSE_RECEIPT',
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey: file.filename,
        originalName: file.originalname,
      },
    });

    try {
      const doc = await expenses.attachDocument(institutionId, req.auth!.userId, String(req.params.id), {
        fileId: created.id,
        kind: req.body.kind,
        note: req.body.note,
      });
      res.status(201).json({
        data: {
          ...doc,
          originalName: created.originalName,
          mimeType: created.mimeType,
          sizeBytes: created.sizeBytes,
          // A path the client can actually fetch. In production this would be a
          // signed object-storage URL rather than a static one.
          url: `/uploads/${created.storageKey}`,
        },
      });
    } catch (e) {
      // Do not leave an unattached file behind on failure — the same receipt
      // uploaded twice is otherwise invisible clutter in the files table.
      await prisma.file.delete({ where: { id: created.id } }).catch(() => {});
      throw e;
    }
  }),
);

router.delete(
  '/expenses/:id/documents/:docId',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await expenses.detachDocument(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        String(req.params.docId),
      ),
    });
  }),
);

// ── One claim ──────────────────────────────────────────────

router.get(
  '/expenses/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await expenses.getExpense(req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

router.post(
  '/expenses/:id/approve',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await expenses.approveExpense(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
      ),
    });
  }),
);

router.post(
  '/expenses/:id/reject',
  validate(idParamSchema, 'params'),
  validate(expenseDecisionSchema),
  wrap(async (req, res) => {
    res.json({
      data: await expenses.rejectExpense(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        String(req.body.reason),
      ),
    });
  }),
);

router.post(
  '/expenses/:id/reopen',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await expenses.reopenExpense(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
      ),
    });
  }),
);

export default router;
export { toRupees };
