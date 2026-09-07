import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  idParamSchema,
  recordPaymentSchema,
  waiveFeeSchema,
  runPayrollSchema,
  addExpenseSchema,
  accountsBroadcastSchema,
} from './accounts.schemas.js';
import * as service from './accounts.service.js';

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
  wrap(async (req, res) => {
    res.json({ data: await service.listCollections(req.auth!.institutionId) });
  }),
);

router.post(
  '/collections',
  validate(recordPaymentSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await service.recordPayment(req.auth!.institutionId, req.auth!.userId, req.body),
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
  wrap(async (req, res) => {
    res.json({ data: await service.listDues(req.auth!.institutionId) });
  }),
);

router.post(
  '/dues/:id/remind',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.remindDue(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
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
      data: await service.waiveFee(
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
