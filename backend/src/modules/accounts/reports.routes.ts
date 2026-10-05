// F-09 Reports — the reporting centre's HTTP surface (docs/users/06 §3.8).
//
// This router applies its OWN auth. It is mounted as a sibling BEFORE
// accountsRoutes, so it no longer inherits `router.use(auth, requireRole(...))`
// from that file — the same latent 500-instead-of-401 bug the payroll structure
// router had.
import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { auth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { unprocessable } from '../../lib/errors.js';
import { prisma } from '../../db/prisma.js';
import { accountsReportQuerySchema, accountsReportExportSchema } from './accounts.schemas.js';
import * as svc from './reports.service.js';
import { buildXlsx } from './reports.xlsx.js';
import { renderReportPdf, reportCsv } from './reports.pdf.js';
import { PERIODS, assertPeriod, toRupees, type Period, type ExportSheet } from './reports.rules.js';
import { UPLOAD_DIR } from './expenses.routes.js';

const router = Router();

router.use(auth, requireRole('ACCOUNTS', 'ADMIN'));

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: (e?: unknown) => void) => {
    fn(req, res).catch(next);
  };

/** `/reports/:report/export` must not be read as a report named "export". */
const REPORTS = ['collections', 'dues', 'expenses', 'payroll', 'scholarships', 'departments', 'comparison'] as const;
type ReportId = (typeof REPORTS)[number];

const assertReport = (v: unknown): ReportId => {
  const s = String(v ?? '');
  if (!(REPORTS as readonly string[]).includes(s)) {
    throw unprocessable(`Unknown report "${v}"`, [{ code: 'BAD_REPORT', message: `Supported: ${REPORTS.join(', ')}` }]);
  }
  return s as ReportId;
};

// ── Literal routes first ──────────────────────────────────────────────────

/** Everything the hub needs to build itself: the report list and every filter. */
router.get(
  '/reports/catalogue',
  wrap(async (_req, res) => {
    res.json({ data: await svc.reportCatalogue() });
  }),
);

/** The headline strip. Every report screen opens with this. */
router.get(
  '/reports/overview',
  validate(accountsReportQuerySchema, 'query'),
  wrap(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    res.json({
      data: await svc.reportsOverview(
        req.auth!.institutionId,
        assertPeriod(q.period ?? 'MONTH'),
        q.anchor,
      ),
    });
  }),
);

/**
 * The export.
 *
 * A real file is written to disk and recorded as a `File` row, exactly the way a
 * payslip is, so the app can say "collections-2026-10.xlsx, 8 KB" and open it.
 * Returning JSON with the bytes inlined would have been easier and is useless:
 * a phone cannot save that.
 */
router.get(
  '/reports/:report/export',
  validate(accountsReportExportSchema, 'query'),
  wrap(async (req, res) => {
    const report = assertReport(req.params.report);
    const q = req.query as Record<string, string | undefined>;
    const period = assertPeriod(q.period ?? 'MONTH');
    const format = String(q.format ?? 'xlsx').toLowerCase();
    if (!['xlsx', 'csv', 'pdf'].includes(format)) {
      throw unprocessable(`Unknown format "${format}"`, [{ code: 'BAD_FORMAT', message: 'Supported: xlsx, csv, pdf' }]);
    }

    const { sheets, title, subtitle } = await svc.exportSheets(report, req.auth!.institutionId, period, q.anchor);
    const stamp = `${period.toLowerCase()}${q.anchor ? `-${q.anchor}` : ''}`;
    const ext = format === 'xlsx' ? 'xlsx' : format === 'csv' ? 'csv' : 'pdf';
    // `File.storageKey` is UNIQUE and the user-facing name stays predictable.
    // Exporting the same report twice must not collide — the second export would
    // otherwise fail on the unique index, or silently overwrite the first file.
    const storageKey = `reports/${report}-${stamp}-${randomUUID().slice(0, 8)}.${ext}`;

    let body: Buffer;
    let mime: string;
    let note: string;
    if (format === 'xlsx') {
      body = buildXlsx(sheets);
      mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      note = 'Open with Excel, LibreOffice or Google Sheets. Money cells are numbers and will sum.';
    } else if (format === 'csv') {
      body = Buffer.from(reportCsv(sheets), 'utf8');
      mime = 'text/csv; charset=utf-8';
      note = 'UTF-8 CSV with a byte-order mark so Excel reads the rupee sign correctly.';
    } else {
      body = renderReportPdf(sheets, { title, subtitle, notes: [`Generated ${new Date().toISOString().slice(0, 10)}`, note3(sheets)] });
      mime = 'application/pdf';
      note = 'Amounts are written as INR because the PDF font cannot encode the rupee sign.';
    }

    const dest = path.join(UPLOAD_DIR, storageKey);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    await fs.promises.writeFile(dest, body);

    const file = await prisma.file.create({
      data: {
        institutionId: req.auth!.institutionId,
        uploaderUserId: req.auth!.userId,
        purpose: 'REPORT',
        mimeType: mime,
        sizeBytes: body.length,
        storageKey,
        originalName: `${report}-${stamp}.${ext}`,
      },
    });

    await svc.auditExport(req.auth!.institutionId, req.auth!.userId, report, format, period);

    res.json({
      data: {
        id: file.id,
        name: file.originalName,
        sizeBytes: body.length,
        mimeType: mime,
        url: `/uploads/${storageKey}`,
        format,
        period,
        report,
        title,
        subtitle,
        note,
        sheetNames: sheets.map((s) => s.name),
        // The totals the export itself was built from, so the screen can show
        // what the file contains without re-deriving it.
        totals: sheetsTotals(sheets),
      },
    });
  }),
);

/** One line under the PDF title stating what it covers. */
function note3(sheets: { name: string; rows: unknown[] }[]): string {
  return sheets.map((s) => `${s.name}: ${s.rows.length} rows`).join(' · ');
}

/** Row counts per sheet, so a user can see an export is empty before opening it. */
function sheetsTotals(sheets: ExportSheet[]) {
  return sheets.map((s) => {
    let moneyMinor = 0;
    let hasMoney = false;
    for (const row of s.rows) {
      for (const col of s.columns) {
        if (col.type !== 'money') continue;
        hasMoney = true;
        const v = col.value(row);
        if (typeof v === 'number') moneyMinor += Math.round(v * 100);
      }
    }
    return {
      name: s.name,
      rows: s.rows.length,
      columns: s.columns.map((c) => c.header),
      ...(hasMoney ? { moneyRupees: toRupees(moneyMinor) } : {}),
    };
  });
}

// ── The seven reports ─────────────────────────────────────────────────────

router.get(
  '/reports/:report',
  validate(accountsReportQuerySchema, 'query'),
  wrap(async (req, res) => {
    const report = assertReport(req.params.report);
    const q = req.query as Record<string, string | undefined>;
    const period: Period = assertPeriod(q.period ?? 'MONTH');
    const i = req.auth!.institutionId;
    const anchor = q.anchor;

    const data =
      report === 'collections' ? await svc.collectionsReport(i, period, anchor)
      : report === 'dues' ? await svc.duesReport(i, period, anchor)
      : report === 'expenses' ? await svc.expensesReport(i, period, anchor)
      : report === 'payroll' ? await svc.payrollReport(i, period, anchor)
      : report === 'scholarships' ? await svc.scholarshipsReport(i, period, anchor)
      : report === 'departments' ? await svc.departmentsReport(i, period, anchor)
      : await svc.comparisonReport(i, (q.granularity as Period) ?? 'MONTH', anchor);

    res.json({ data });
  }),
);

export default router;
export { PERIODS, REPORTS };
