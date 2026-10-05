// Fundraising + donations routes.
// Docs: 12-alumni-relations.md §3.4
//
// Mounted at `/donations` inside the alumni router, which already applies
// `auth` + `requireRole('ALUMNI','ADMIN')`. These routes add their own validation
// and the office/graduate split.
//
// Route order matters here: `/receipts/verify` is declared BEFORE `/:id/receipt`
// style patterns so a literal segment is never swallowed by a parameter.

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { validate } from '../../../middlewares/validate.js';
import { idParamSchema } from '../alumni.schemas.js';
import * as directory from '../directory.service.js';
import * as donations from './donations.service.js';
import * as campaigns from './campaigns.service.js';
import * as giving from './giving.service.js';
import * as recurring from './recurring.service.js';
import * as receipts from './receipts.service.js';
import {
  donationPageQuerySchema,
  campaignQuerySchema,
  campaignCreateSchema,
  campaignUpdateSchema,
  pledgeSchema,
  recordDonationSchema,
  mandateCreateSchema,
  mandateStatusSchema,
  mandateListQuerySchema,
  receiptVerifySchema,
} from './donations.schemas.js';

const router = Router();

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

/** The privacy-aware viewer, resolved once per request. */
async function viewerFor(req: Request) {
  const institutionId = req.auth!.institutionId;
  const office = await directory.officeUserIds(institutionId);
  return directory.resolveViewer(req.auth!.userId, institutionId, office);
}

// ── Campaigns ─────────────────────────────────────────────────────────────

router.get(
  '/campaigns',
  validate(campaignQuerySchema, 'query'),
  wrap(async (req, res) => {
    const q = req.query as { category?: string; includeClosed?: string };
    res.json({
      data: await campaigns.listCampaigns(req.auth!.institutionId, {
        category: q.category,
        includeClosed: q.includeClosed === 'true',
      }),
    });
  }),
);

router.post(
  '/campaigns',
  validate(campaignCreateSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.status(201).json({ data: await campaigns.createCampaign(viewer, req.body) });
  }),
);

// Declared before `/campaigns/:id` is irrelevant — the paths differ in arity —
// but kept adjacent so the collection and its item stay together.
router.get(
  '/campaigns/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await campaigns.getCampaign(req.auth!.institutionId, String(req.params.id), viewer) });
  }),
);

router.patch(
  '/campaigns/:id',
  validate(idParamSchema, 'params'),
  validate(campaignUpdateSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await campaigns.updateCampaign(viewer, String(req.params.id), req.body) });
  }),
);

// ── Donation ledger ───────────────────────────────────────────────────────

router.get(
  '/',
  validate(donationPageQuerySchema, 'query'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const q = req.query as {
      page?: string;
      pageSize?: string;
      campaignId?: string;
      fund?: string;
      status?: string;
      year?: string;
      mine?: string;
    };
    res.json({
      data: await donations.listDonations(req.auth!.institutionId, viewer, {
        page: q.page ? Number(q.page) : undefined,
        pageSize: q.pageSize ? Number(q.pageSize) : undefined,
        campaignId: q.campaignId,
        fund: q.fund,
        status: q.status,
        year: q.year ? Number(q.year) : undefined,
        mine: q.mine === 'true',
      }),
    });
  }),
);

/** An alumnus commits to a gift. This route did not exist before. */
router.post(
  '/',
  validate(pledgeSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.status(201).json({ data: await giving.pledgeDonation(viewer, req.body) });
  }),
);

/**
 * Contribution impact for the caller.
 *
 * Declared BEFORE `/:id` on purpose: Express matches in declaration order, so a
 * route added after `/:id` would have "impact" read as a donation id and 404.
 */
router.get(
  '/impact',
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await donations.getMyImpact(req.auth!.institutionId, viewer) });
  }),
);

router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const donation = await donations.getDonation(req.auth!.institutionId, String(req.params.id), viewer);
    // 404 rather than 403 for "not yours": a 403 confirms the donation exists.
    if (!donation) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Donation not found' } });
      return;
    }
    res.json({ data: donation });
  }),
);

/** Office confirms the money arrived → Payment + Receipt + RECEIVED. */
router.post(
  '/:id/record',
  validate(idParamSchema, 'params'),
  validate(recordDonationSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await giving.recordDonation(viewer, String(req.params.id), req.ip ?? null) });
  }),
);

router.get(
  '/:id/receipt',
  validate(idParamSchema, 'params'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const receipt = await receipts.receiptForDonation(req.auth!.institutionId, String(req.params.id), viewer);
    if (!receipt) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Receipt not found' } });
      return;
    }
    res.json({ data: receipt });
  }),
);

// ── Recurring contributions ───────────────────────────────────────────────

router.get(
  '/recurring',
  validate(mandateListQuerySchema, 'query'),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    const q = req.query as { dueOnly?: string };
    res.json({
      data: await recurring.listMandates(req.auth!.institutionId, viewer, { dueOnly: q.dueOnly === 'true' }),
    });
  }),
);

router.post(
  '/recurring',
  validate(mandateCreateSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.status(201).json({ data: await recurring.createMandate(viewer, req.body) });
  }),
);

router.post(
  '/recurring/charge-due',
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({ data: await recurring.chargeDueMandates(viewer) });
  }),
);

router.post(
  '/recurring/:id/status',
  validate(idParamSchema, 'params'),
  validate(mandateStatusSchema),
  wrap(async (req, res) => {
    const viewer = await viewerFor(req);
    res.json({
      data: await recurring.setMandateStatus(
        viewer,
        String(req.params.id),
        req.body.action,
        req.body.reason,
      ),
    });
  }),
);

// ── Receipt verification ──────────────────────────────────────────────────
// Public by design (an auditor verifying a printed receipt has no account), and
// therefore deliberately narrow: it returns amount, date and validity, never a
// donor name. Declared last so the `:id` routes above cannot shadow it — the
// paths differ, but keeping the unauthenticated-shaped route at the end makes the
// exposure obvious to a reader.
router.get(
  '/receipts/verify',
  validate(receiptVerifySchema, 'query'),
  wrap(async (req, res) => {
    const result = await receipts.verifyReceipt(req.auth!.institutionId, String(req.query.receiptNo));
    res.json({ data: result });
  }),
);

export default router;
