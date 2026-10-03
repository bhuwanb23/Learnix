import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  idParamSchema,
  recordCollectionSchema,
  reverseCollectionSchema,
  collectionQuerySchema,
  statementQuerySchema,
  studentSearchQuerySchema,
  waiveFeeSchema,
  reinstateDueSchema,
  duesQuerySchema,
  remindDueSchema,
  runPayrollSchema,
  addExpenseSchema,
  accountsBroadcastSchema,
} from './accounts.schemas.js';
import * as service from './accounts.service.js';
import * as collections from './collections.service.js';
import * as dues from './dues.service.js';

// Accounts & Finance module — mounted at /api/v1/accounts (docs/users/06 §4)
const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('ACCOUNTS', 'ADMIN'));

// F-01 dashboard
router.get(
  '/dashboard',
  wrap(async (req, res) => {
    res.json({ data: await service.getDashboard(req.auth!.institutionId) });
  }),
);

// F-02 collections
router.get(
  '/collections',
  validate(collectionQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await collections.listCollections(req.auth!.institutionId, {
        q: req.query.q ? String(req.query.q) : undefined,
        category: req.query.category as never,
        method: req.query.method as never,
        status: req.query.status as never,
        range: req.query.range as never,
        sort: req.query.sort as never,
        take: req.query.take ? Number(req.query.take) : undefined,
        skip: req.query.skip ? Number(req.query.skip) : undefined,
      }),
    });
  }),
);

router.post(
  '/collections',
  validate(recordCollectionSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await collections.recordCollection(
        req.auth!.institutionId,
        req.auth!.userId,
        req.body,
      ),
    });
  }),
);

// The two literal sub-paths MUST be declared before `/collections/:id` —
// Express matches in order, and a static segment loses to a param otherwise,
// so `/collections/statement` would be read as a payment id.
router.get(
  '/collections/students/search',
  validate(studentSearchQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await collections.searchPayableStudents(
        req.auth!.institutionId,
        String(req.query.q),
        req.query.limit ? Number(req.query.limit) : 10,
      ),
    });
  }),
);

router.get(
  '/collections/statement',
  validate(statementQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await collections.getStudentStatement(req.auth!.institutionId, {
        rollNo: req.query.rollNo ? String(req.query.rollNo) : undefined,
        studentProfileId: req.query.studentProfileId ? String(req.query.studentProfileId) : undefined,
      }),
    });
  }),
);

router.get(
  '/collections/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await collections.getCollectionDetail(req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

router.post(
  '/collections/:id/reverse',
  validate(idParamSchema, 'params'),
  validate(reverseCollectionSchema),
  wrap(async (req, res) => {
    res.json({
      data: await collections.reverseCollection(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body.reason,
      ),
    });
  }),
);

// F-05 unified ledger
router.get(
  '/ledger',
  wrap(async (req, res) => {
    res.json({ data: await service.getLedger(req.auth!.institutionId) });
  }),
);

// F-03 fee structures
router.get(
  '/fee-structure',
  wrap(async (req, res) => {
    res.json({ data: await service.listFeeStructures(req.auth!.institutionId) });
  }),
);

router.post(
  '/fee-structure/:id/revision',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.requestRevision(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
      ),
    });
  }),
);

// F-04 dues
router.get(
  '/dues',
  validate(duesQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await dues.listDues(req.auth!.institutionId, {
        q: req.query.q ? String(req.query.q) : undefined,
        status: req.query.status as never,
        bucket: req.query.bucket as never,
        sort: req.query.sort as never,
        take: req.query.take ? Number(req.query.take) : undefined,
        skip: req.query.skip ? Number(req.query.skip) : undefined,
      }),
    });
  }),
);

router.get(
  '/dues/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await dues.getDueDetail(req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

router.post(
  '/dues/:id/remind',
  validate(idParamSchema, 'params'),
  validate(remindDueSchema),
  wrap(async (req, res) => {
    res.json({
      data: await dues.remindDue(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body.note,
      ),
    });
  }),
);

router.post(
  '/dues/:id/waive',
  validate(idParamSchema, 'params'),
  validate(waiveFeeSchema),
  wrap(async (req, res) => {
    res.json({
      data: await dues.waiveFee(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body.reason,
      ),
    });
  }),
);

router.post(
  '/dues/:id/reinstate',
  validate(idParamSchema, 'params'),
  validate(reinstateDueSchema),
  wrap(async (req, res) => {
    res.json({
      data: await dues.reinstateDue(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body.reason,
      ),
    });
  }),
);

// F-06 payroll
router.get(
  '/payroll',
  wrap(async (req, res) => {
    res.json({ data: await service.listPayroll(req.auth!.institutionId) });
  }),
);

router.post(
  '/payroll/run',
  validate(runPayrollSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await service.runPayroll(req.auth!.institutionId, req.auth!.userId, req.body.month),
    });
  }),
);

router.post(
  '/payroll/:id/mark-paid',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.markPayrollPaid(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
      ),
    });
  }),
);

// F-07 expenses
router.get(
  '/expenses',
  wrap(async (req, res) => {
    res.json({ data: await service.listExpenses(req.auth!.institutionId) });
  }),
);

router.post(
  '/expenses',
  validate(addExpenseSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await service.addExpense(req.auth!.institutionId, req.auth!.userId, req.body),
    });
  }),
);

router.post(
  '/expenses/:id/approve',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.approveExpense(
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
  wrap(async (req, res) => {
    res.json({
      data: await service.rejectExpense(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
      ),
    });
  }),
);

// F-08 scholarships
router.get(
  '/scholarships',
  wrap(async (req, res) => {
    res.json({ data: await service.listScholarships(req.auth!.institutionId) });
  }),
);

router.post(
  '/scholarships/:id/approve',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.approveScholarship(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
      ),
    });
  }),
);

router.post(
  '/scholarships/:id/disburse',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.disburseScholarship(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
      ),
    });
  }),
);

// F-09 reports
router.get(
  '/reports',
  wrap(async (req, res) => {
    res.json({ data: await service.getReports(req.auth!.institutionId) });
  }),
);

// F-10 notifications + broadcast + profile
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
  validate(accountsBroadcastSchema),
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
