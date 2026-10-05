// Payroll salary-desk routes — mounted at /api/v1/accounts (docs/users/06 §3.4).
//
// Its own file for the same reason expenses/feestructure have one: the literal
// sub-resource routes here (`/payroll/salary-records`, `/payroll/alerts`,
// `/payroll/loans`, …) MUST be registered before `/payroll/:id`. In the shared
// accounts router that ordering is invisible, and a param route registered first
// reads "alerts" as a run id and 404s a perfectly good screen.
import { Router, type Request, type Response } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  payrollEntryParamSchema,
  attendanceMonthQuerySchema,
  staffParamSchema,
  staffMonthQuerySchema,
  monthQuerySchema,
  attendanceQuerySchema,
  saveSalaryRecordSchema,
  replacePayComponentsSchema,
  salaryRecordParamSchema,
  grantLoanSchema,
  loanRecoverySchema,
  cancelLoanSchema,
  loanParamSchema,
  attendanceSchema,
  attachPayslipSchema,
} from './accounts.schemas.js';
import * as structure from './payroll.structure.js';

const router = Router();

// This router applies its OWN auth rather than inheriting it. `accountsRoutes`
// runs `router.use(auth, ...)` and the salary desk is mounted BEFORE it (so its
// literal paths are not read as a run id), which means it can no longer rely on
// that middleware having run. Without this line every handler below would throw
// on `req.auth!.institutionId` with a 500 instead of a 401.
router.use(auth, requireRole('ACCOUNTS', 'ADMIN'));

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: (e?: unknown) => void) => {
    fn(req, res).catch(next);
  };

// ── Alerts & ageing (literal — must precede /payroll/:id) ────────────────
router.get(
  '/payroll/alerts',
  wrap(async (req, res) => {
    res.json({ data: await structure.listAlerts(req.auth!.institutionId, req.auth!.userId) });
  }),
);

router.get(
  '/payroll/ageing',
  wrap(async (req, res) => {
    res.json({ data: await structure.payrollAgeing(req.auth!.institutionId) });
  }),
);

// ── Salary records ────────────────────────────────────────────────────────
router.get(
  '/payroll/salary-records',
  validate(monthQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await structure.listSalaryDesk(
        req.auth!.institutionId,
        req.query.month ? String(req.query.month) : undefined,
      ),
    });
  }),
);

// The real create route. A salary belongs to a person, so it is nested under the
// staff member rather than guessed from a body field.
router.post(
  '/payroll/staff/:staffUserId/salary',
  validate(staffParamSchema, 'params'),
  validate(saveSalaryRecordSchema, 'body'),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await structure.saveSalaryRecord(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.staffUserId),
        req.body as never,
      ),
    });
  }),
);

router.get(
  '/payroll/staff/:staffUserId/salary',
  validate(staffParamSchema, 'params'),
  validate(staffMonthQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await structure.getStaffSalary(
        req.auth!.institutionId,
        String(req.params.staffUserId),
        req.query.month ? String(req.query.month) : undefined,
      ),
    });
  }),
);

router.put(
  '/payroll/salary-records/:salaryRecordId/components',
  validate(salaryRecordParamSchema, 'params'),
  validate(replacePayComponentsSchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await structure.replaceComponents(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.salaryRecordId),
        (req.body as { components: never[] }).components,
      ),
    });
  }),
);

// ── Attendance ────────────────────────────────────────────────────────────
router.get(
  '/payroll/staff/:staffUserId/attendance',
  validate(staffParamSchema, 'params'),
  validate(attendanceQuerySchema, 'query'),
  wrap(async (req, res) => {
    const month = req.query.month ? String(req.query.month) : new Date().toISOString().slice(0, 7);
    res.json({
      data: await structure.deriveAttendanceFor(
        req.auth!.institutionId,
        String(req.params.staffUserId),
        month,
        req.query.workingDays ? Number(req.query.workingDays) : undefined,
      ),
    });
  }),
);

// The month travels as a query param so the body stays the attendance itself.
router.put(
  '/payroll/staff/:staffUserId/attendance',
  validate(staffParamSchema, 'params'),
  validate(attendanceMonthQuerySchema, 'query'),
  validate(attendanceSchema, 'body'),
  wrap(async (req, res) => {
    const month = String(req.query.month ?? new Date().toISOString().slice(0, 7));
    res.json({
      data: await structure.saveAttendance(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.staffUserId),
        month,
        req.body as never,
      ),
    });
  }),
);

// ── Loans & advances ──────────────────────────────────────────────────────
router.post(
  '/payroll/staff/:staffUserId/loans',
  validate(staffParamSchema, 'params'),
  validate(grantLoanSchema, 'body'),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await structure.grantLoan(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.staffUserId),
        req.body as never,
      ),
    });
  }),
);

router.post(
  '/payroll/loans/:loanId/recover',
  validate(loanParamSchema, 'params'),
  validate(loanRecoverySchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await structure.recordRecovery(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.loanId),
        req.body as never,
      ),
    });
  }),
);

router.post(
  '/payroll/loans/:loanId/cancel',
  validate(loanParamSchema, 'params'),
  validate(cancelLoanSchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await structure.cancelLoan(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.loanId),
        (req.body as { reason?: string | null }).reason ?? null,
      ),
    });
  }),
);

// ── Payslip generation (literal — must precede /payroll/:id) ─────────────
router.get(
  '/payroll/entries/:entryId/payslip',
  validate(payrollEntryParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await structure.getPayslipDocument(req.auth!.institutionId, String(req.params.entryId)),
    });
  }),
);

router.post(
  '/payroll/entries/:entryId/payslip',
  validate(payrollEntryParamSchema, 'params'),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await structure.generatePayslip(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.entryId),
      ),
    });
  }),
);

router.put(
  '/payroll/entries/:entryId/payslip',
  validate(payrollEntryParamSchema, 'params'),
  validate(attachPayslipSchema, 'body'),
  wrap(async (req, res) => {
    res.json({
      data: await structure.attachPayslip(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.entryId),
        (req.body as { fileId: string }).fileId,
      ),
    });
  }),
);

// ── The component catalogue, so the app never invents a code ──────────────
router.get(
  '/payroll/components',
  wrap(async (_req, res) => {
    res.json({
      data: {
        components: Object.entries(structure.COMPONENT_CATALOG).map(([code, m]) => ({ code, ...m })),
        kinds: structure.COMPONENT_KINDS,
        bases: structure.COMPONENT_BASES,
        defaultComponents: structure.defaultComponents(10000000),
      },
    });
  }),
);

export default router;

