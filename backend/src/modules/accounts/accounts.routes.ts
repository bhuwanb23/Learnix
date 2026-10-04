import { Router } from 'express';
import { z } from 'zod';
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
  studentBalancesQuerySchema,
  courseDuesQuerySchema,
  lateFeeRuleSchema,
  runLateFeeSchema,
  assessLateFeeSchema,
  waiveLateFeeSchema,
  planSchema,
  planListQuerySchema,
  cancelPlanSchema,
  bulkRemindSchema,
  runPayrollSchema,
  payPayrollEntrySchema,
  payPayrollRunSchema,
  adjustPayrollEntrySchema,
  payrollEntryParamSchema,
  accountsBroadcastSchema,
} from './accounts.schemas.js';
import * as service from './accounts.service.js';
import * as collections from './collections.service.js';
import * as dues from './dues.service.js';
import * as payroll from './payroll.service.js';
import expenseRoutes from './expenses.routes.js';

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

// ── Dues: literal sub-paths FIRST ───────────────────────────
// Express matches in registration order, so `/dues/students`, `/dues/courses`,
// `/dues/plans`, `/dues/late-fee` and `/dues/remind-bulk` are all registered
// before `/dues/:id`. Register the param first and "students" is read as a due
// id, which 404s a perfectly good screen.
router.get(
  '/dues/students',
  validate(studentBalancesQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await dues.listStudentBalances(req.auth!.institutionId, {
        q: req.query.q ? String(req.query.q) : undefined,
        programId: req.query.programId ? String(req.query.programId) : undefined,
        minDaysOverdue: req.query.minDaysOverdue ? Number(req.query.minDaysOverdue) : undefined,
        take: req.query.take ? Number(req.query.take) : undefined,
        skip: req.query.skip ? Number(req.query.skip) : undefined,
      }),
    });
  }),
);

router.get(
  '/dues/students/:studentProfileId',
  validate(z.object({ studentProfileId: idParamSchema.shape.id }), 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await dues.getStudentDues(
        req.auth!.institutionId,
        String(req.params.studentProfileId),
      ),
    });
  }),
);

router.get(
  '/dues/courses',
  validate(courseDuesQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await dues.listCourseDues(req.auth!.institutionId, {
        academicYearId: req.query.academicYearId ? String(req.query.academicYearId) : undefined,
        programId: req.query.programId ? String(req.query.programId) : undefined,
        semester: req.query.semester ? Number(req.query.semester) : undefined,
      }),
    });
  }),
);

router.get(
  '/dues/plans',
  validate(planListQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await dues.listPlans(req.auth!.institutionId, {
        status: req.query.status ? String(req.query.status) : undefined,
      }),
    });
  }),
);

// The fine policy AND what running it would do right now, in one response. An
// officer must never have to press "apply" to find out what "apply" costs.
router.get(
  '/dues/late-fee',
  wrap(async (req, res) => {
    res.json({ data: await dues.getLateFeeSettings(req.auth!.institutionId) });
  }),
);

router.put(
  '/dues/late-fee',
  validate(lateFeeRuleSchema),
  wrap(async (req, res) => {
    res.json({
      data: await dues.saveLateFeeRule(
        req.auth!.institutionId,
        req.auth!.userId,
        req.body,
      ),
    });
  }),
);

router.post(
  '/dues/late-fee/run',
  validate(runLateFeeSchema),
  wrap(async (req, res) => {
    res.json({
      data: await dues.runLateFeeAssessment(
        req.auth!.institutionId,
        req.auth!.userId,
        req.body,
      ),
    });
  }),
);

// The preview is a POST because it takes the same body as the send (an explicit
// selection, or the whole filtered list) and must run the identical selection
// logic — a GET preview built from query params would drift the moment the
// filter changes. Returns WHO would be reached and, per row, WHY anyone is
// skipped, so "remind everyone" can never be an unverified tap.
router.post(
  '/dues/remind-bulk/preview',
  validate(bulkRemindSchema),
  wrap(async (req, res) => {
    res.json({
      data: await dues.previewBulkRemind(req.auth!.institutionId, req.body),
    });
  }),
);

router.post(
  '/dues/remind-bulk',
  validate(bulkRemindSchema),
  wrap(async (req, res) => {
    res.json({
      data: await dues.remindBulk(req.auth!.institutionId, req.auth!.userId, req.body),
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

router.post(
  '/dues/:id/late-fee',
  validate(idParamSchema, 'params'),
  validate(assessLateFeeSchema),
  wrap(async (req, res) => {
    res.json({
      data: await dues.assessLateFee(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body,
      ),
    });
  }),
);

router.delete(
  '/dues/:id/late-fee',
  validate(idParamSchema, 'params'),
  validate(waiveLateFeeSchema),
  wrap(async (req, res) => {
    res.json({
      data: await dues.waiveLateFee(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body.reason,
      ),
    });
  }),
);

router.get(
  '/dues/:id/plan',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    // The plan a due belongs to, in either direction: an instalment knows its
    // plan, and the replaced parent knows the plan that replaced it.
    const due = await dues.getDuePlan(req.auth!.institutionId, String(req.params.id));
    res.json({ data: due });
  }),
);

router.post(
  '/dues/:id/plan',
  validate(idParamSchema, 'params'),
  validate(planSchema),
  wrap(async (req, res) => {
    res.json({
      data: await dues.createInstallmentPlan(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body,
      ),
    });
  }),
);

router.post(
  '/dues/plans/:planId/cancel',
  validate(z.object({ planId: idParamSchema.shape.id }), 'params'),
  validate(cancelPlanSchema),
  wrap(async (req, res) => {
    res.json({
      data: await dues.cancelInstallmentPlan(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.planId),
        req.body.reason,
      ),
    });
  }),
);

// F-06 payroll — the hub, one run, one payslip.
// Route order matters: the literal sub-paths (`/payroll/run`, `/payroll/entries/…`)
// are registered before `/payroll/:id`, or Express would read "run" and "entries"
// as a run id and 404 a perfectly good request.
router.get(
  '/payroll',
  wrap(async (req, res) => {
    res.json({ data: await payroll.listPayroll(req.auth!.institutionId) });
  }),
);

router.post(
  '/payroll/run',
  validate(runPayrollSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await payroll.runPayroll(
        req.auth!.institutionId,
        req.auth!.userId,
        req.body.month,
        req.body.note,
      ),
    });
  }),
);

router.get(
  '/payroll/entries/:entryId',
  validate(payrollEntryParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await payroll.getPayslip(req.auth!.institutionId, String(req.params.entryId)),
    });
  }),
);

router.post(
  '/payroll/entries/:entryId/pay',
  validate(payrollEntryParamSchema, 'params'),
  validate(payPayrollEntrySchema),
  wrap(async (req, res) => {
    res.json({
      data: await payroll.payPayrollEntry(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.entryId),
        req.body,
      ),
    });
  }),
);

router.patch(
  '/payroll/entries/:entryId',
  validate(payrollEntryParamSchema, 'params'),
  validate(adjustPayrollEntrySchema),
  wrap(async (req, res) => {
    res.json({
      data: await payroll.adjustPayrollEntry(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.entryId),
        req.body,
      ),
    });
  }),
);

router.get(
  '/payroll/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({ data: await payroll.getPayrollRun(req.auth!.institutionId, String(req.params.id)) });
  }),
);

router.post(
  '/payroll/:id/approve',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await payroll.approvePayrollRun(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
      ),
    });
  }),
);

router.post(
  '/payroll/:id/pay-all',
  validate(idParamSchema, 'params'),
  validate(payPayrollRunSchema),
  wrap(async (req, res) => {
    res.json({
      data: await payroll.payAllPayrollEntries(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body,
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

// Expenses is mounted LAST, and on purpose: every `/expenses/*` literal route
// lives in its own file so its ordering against `/expenses/:id` is readable, and
// mounting it after the rest of this router means an expense path can never be
// shadowed by something registered here later.
router.use(expenseRoutes);

export default router;
