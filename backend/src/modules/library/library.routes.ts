import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  idParamSchema,
  addBookSchema,
  updateBookSchema,
  issueBookSchema,
  returnBookSchema,
  renewLoanSchema,
  loanQuerySchema,
  loanHistoryQuerySchema,
  studentSearchQuerySchema,
  collectFineSchema,
  waiveFineSchema,
  extendFineSchema,
  bulkSettleSchema,
  fineQuerySchema,
  requestDecisionSchema,
  addDigitalResourceSchema,
  updateDigitalResourceSchema,
  grantAccessSchema,
  recordAccessSchema,
  digitalQuerySchema,
  libraryBroadcastSchema,
  catalogQuerySchema,
} from './library.schemas.js';
import * as service from './library.service.js';
import * as circulation from './circulation.service.js';
import * as digital from './digital.service.js';
import * as fines from './fines.service.js';

// Library Staff module — mounted at /api/v1/library (docs/users/07 §4)
const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

router.use(auth, requireRole('LIBRARY', 'ADMIN'));

// L-01 dashboard
router.get(
  '/dashboard',
  wrap(async (req, res) => {
    res.json({ data: await service.getDashboard(req.auth!.institutionId) });
  }),
);

// L-02 catalog
router.get(
  '/catalog',
  validate(catalogQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await service.listCatalog(
        req.auth!.institutionId,
        req.query as { q?: string; category?: string },
      ),
    });
  }),
);

router.get(
  '/catalog/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await service.getBookDetail(req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

router.post(
  '/catalog',
  validate(addBookSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await service.addBook(req.auth!.institutionId, req.auth!.userId, req.body),
    });
  }),
);

router.put(
  '/catalog/:id',
  validate(idParamSchema, 'params'),
  validate(updateBookSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.updateBook(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body,
      ),
    });
  }),
);

// L-03 circulation: loan queries, issue, renew, return
router.get(
  '/circulation/loans',
  validate(loanQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await circulation.listLoans(
        req.auth!.institutionId,
        req.query as { q?: string; status?: 'ALL' | 'ACTIVE' | 'ISSUED' | 'OVERDUE' | 'DUE_SOON' | 'DUE_TODAY'; limit?: number },
      ),
    });
  }),
);

router.get(
  '/circulation/history',
  validate(loanHistoryQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await circulation.listLoanHistory(
        req.auth!.institutionId,
        req.query as { q?: string; studentId?: string; from?: string; to?: string; limit?: number },
      ),
    });
  }),
);

router.get(
  '/circulation/loans/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await circulation.getLoanDetail(req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

router.get(
  '/circulation/students',
  validate(studentSearchQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await circulation.searchStudents(req.auth!.institutionId, {
        q: String(req.query.q),
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      }),
    });
  }),
);

router.get(
  '/circulation/students/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await circulation.getStudentBorrowingProfile(
        req.auth!.institutionId,
        String(req.params.id),
      ),
    });
  }),
);

router.post(
  '/circulation/issue',
  validate(issueBookSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await circulation.issueBook(req.auth!.institutionId, req.auth!.userId, req.body),
    });
  }),
);

router.post(
  '/circulation/return',
  validate(returnBookSchema),
  wrap(async (req, res) => {
    res.json({
      data: await circulation.returnBook(
        req.auth!.institutionId,
        req.auth!.userId,
        req.body.issueId,
      ),
    });
  }),
);

router.post(
  '/circulation/loans/:id/renew',
  validate(idParamSchema, 'params'),
  validate(renewLoanSchema),
  wrap(async (req, res) => {
    res.json({
      data: await circulation.renewLoan(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        { days: req.body.days },
      ),
    });
  }),
);

// L-04 fines
router.get(
  '/fines',
  validate(fineQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await fines.listFines(
        req.auth!.institutionId,
        req.query as {
          q?: string; status?: 'ALL' | 'PENDING' | 'PAID' | 'WAIVED';
          minAmount?: number; sort?: 'NEWEST' | 'AMOUNT' | 'DAYS'; limit?: number;
        },
      ),
    });
  }),
);

router.post(
  '/fines/settle',
  validate(bulkSettleSchema),
  wrap(async (req, res) => {
    res.json({ data: await fines.settleStudentFines(req.auth!.institutionId, req.auth!.userId, req.body) });
  }),
);

router.get(
  '/fines/students/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await fines.getStudentFines(req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

router.get(
  '/fines/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await fines.getFineDetail(req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

router.post(
  '/fines/:id/collect',
  validate(idParamSchema, 'params'),
  validate(collectFineSchema),
  wrap(async (req, res) => {
    res.json({
      data: await fines.collectFine(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body.method,
      ),
    });
  }),
);

router.post(
  '/fines/:id/waive',
  validate(idParamSchema, 'params'),
  validate(waiveFineSchema),
  wrap(async (req, res) => {
    res.json({
      data: await fines.waiveFine(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body.reason,
      ),
    });
  }),
);

router.post(
  '/fines/:id/extend',
  validate(idParamSchema, 'params'),
  validate(extendFineSchema),
  wrap(async (req, res) => {
    res.json({
      data: await fines.extendDueDate(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body.days,
      ),
    });
  }),
);

// L-05 book requests
router.get(
  '/requests',
  wrap(async (req, res) => {
    res.json({ data: await service.listRequests(req.auth!.institutionId) });
  }),
);

router.post(
  '/requests/:id/decide',
  validate(idParamSchema, 'params'),
  validate(requestDecisionSchema),
  wrap(async (req, res) => {
    res.json({
      data: await service.decideRequest(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body.decision,
      ),
    });
  }),
);

// L-06 digital library
router.get(
  '/digital',
  validate(digitalQuerySchema, 'query'),
  wrap(async (req, res) => {
    res.json({
      data: await digital.listDigitalResources(
        req.auth!.institutionId,
        req.query as {
          q?: string; type?: string; status?: 'ALL' | 'ACTIVE' | 'ARCHIVED';
          audience?: 'ALL' | 'GRANTED' | 'PUBLIC'; sort?: 'TITLE' | 'NEWEST' | 'POPULAR';
        },
      ),
    });
  }),
);

router.get(
  '/digital/audiences',
  wrap(async (req, res) => {
    res.json({ data: await digital.listAudiences(req.auth!.institutionId) });
  }),
);

router.get(
  '/digital/usage',
  wrap(async (req, res) => {
    res.json({ data: await digital.getUsageReport(req.auth!.institutionId) });
  }),
);

router.get(
  '/digital/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await digital.getDigitalResourceDetail(req.auth!.institutionId, String(req.params.id)),
    });
  }),
);

router.post(
  '/digital',
  validate(addDigitalResourceSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await digital.createDigitalResource(
        req.auth!.institutionId,
        req.auth!.userId,
        req.body,
      ),
    });
  }),
);

router.put(
  '/digital/:id',
  validate(idParamSchema, 'params'),
  validate(updateDigitalResourceSchema),
  wrap(async (req, res) => {
    res.json({
      data: await digital.updateDigitalResource(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body,
      ),
    });
  }),
);

router.delete(
  '/digital/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await digital.deleteDigitalResource(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
      ),
    });
  }),
);

router.post(
  '/digital/:id/grant-access',
  validate(idParamSchema, 'params'),
  validate(grantAccessSchema),
  wrap(async (req, res) => {
    res.json({
      data: await digital.grantAccess(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        req.body,
      ),
    });
  }),
);

router.delete(
  '/digital/:id/grants/:grantId',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    res.json({
      data: await digital.revokeAccess(
        req.auth!.institutionId,
        req.auth!.userId,
        String(req.params.id),
        String(req.params.grantId),
      ),
    });
  }),
);

router.post(
  '/digital/:id/access',
  validate(idParamSchema, 'params'),
  validate(recordAccessSchema),
  wrap(async (req, res) => {
    res.status(201).json({
      data: await digital.recordAccess(req.auth!.institutionId, String(req.params.id), req.body),
    });
  }),
);

// L-07 notifications + broadcast + profile
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
  validate(libraryBroadcastSchema),
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
