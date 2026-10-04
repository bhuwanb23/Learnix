// HTTP contract for F-07 Expenses (docs/users/06 §3.6).
//
// This exists because a direct service call cannot see whether `/expenses/:id`
// shadowed `/expenses/budgets` — that bug is invisible until a screen 404s. It
// also exercises the REAL multipart upload, including a rejected mime type and
// a failed attach, neither of which a service-level call can reach.
//
// Usage: npx tsx scripts/verify-expenses-http.ts
import jwt from 'jsonwebtoken';
import { unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import { CATEGORY_IDS, currentFiscalYear, monthKey } from '../src/modules/accounts/expenses.money.js';
import { UPLOAD_DIR } from '../src/modules/accounts/expenses.routes.js';

let passed = 0;
let failed = 0;
const fails: string[] = [];

function check(label: string, ok: boolean, detail?: string) {
  if (ok) { passed += 1; console.log(`  ✓ ${label}`); }
  else {
    failed += 1;
    const line = `${label}${detail ? ` — ${detail}` : ''}`;
    fails.push(line);
    console.log(`  ✗ ${line}`);
  }
}

const app = createApp();
const server = app.listen(0);
const port = (server.address() as any).port;
const BASE = `http://127.0.0.1:${port}`;

async function api(
  path: string, token?: string, method = 'GET', body?: unknown,
): Promise<{ status: number; json: any }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as any };
}

/** Multipart upload. `FormData` + `Blob` exist in Node 18+, which is why this
 *  can test the real upload path rather than mocking it. */
async function upload(
  routePath: string, token: string,
  fields: Record<string, string>, file: { name: string; type: string; body: string },
) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  fd.append('file', new Blob([file.body], { type: file.type }), file.name);
  const res = await fetch(`${BASE}${routePath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as any };
}

async function run() {
  const inst = await prisma.institution.findFirst({ orderBy: { createdAt: 'asc' } });
  const instId = inst!.id;
  const actor = await prisma.user.findFirst({
    where: { institutionId: instId, deletedAt: null }, select: { id: true },
  });
  const token = jwt.sign(
    { sub: actor!.id, institutionId: instId, roles: ['ACCOUNTS'] },
    env.jwtAccessSecret, { expiresIn: '1h' },
  );

  const marker = randomUUID().slice(0, 8);
  const createdExpenseIds: string[] = [];
  const createdFileIds: string[] = [];
  const uploadedPaths: string[] = [];

  try {
    // ── Route ordering: the literal paths must not be read as an :id ──
    console.log('\nliteral routes are not shadowed by /expenses/:id');
    const endpoints: Array<[string, string]> = [
      ['/api/v1/accounts/expenses/budgets', 'budgets'],
      ['/api/v1/accounts/expenses/trends', 'trends'],
      ['/api/v1/accounts/expenses/vendors', 'vendors'],
      ['/api/v1/accounts/expenses/departments', 'departments'],
    ];
    for (const [route, label] of endpoints) {
      const r = await api(route, token);
      check(`GET ${label} responds 200, not 404`, r.status === 200,
        `${r.status} ${r.json?.error?.message ?? ''}`);
    }

    // A genuinely unknown id still 404s, proving :id is still wired.
    const bogus = await api(`/api/v1/accounts/expenses/${randomUUID()}`, token);
    check('an unknown expense id still 404s', bogus.status === 404, `${bogus.status}`);

    // ── Auth ──
    console.log('\nauth');
    for (const [route] of endpoints) {
      const r = await api(route);
      check(`GET ${route.split('/').pop()} without a token is 401`, r.status === 401, `${r.status}`);
    }
    const badToken = await api('/api/v1/accounts/expenses', 'not-a-real-token');
    check('a forged token is refused', badToken.status === 401, `${badToken.status}`);

    // ── Validation ──
    console.log('\nvalidation');
    const zero = await api('/api/v1/accounts/expenses', token, 'POST', {
      category: CATEGORY_IDS[0], amountMinor: 0,
    });
    check('a zero amount is a 400', zero.status === 400, `${zero.status}`);
    const badCat = await api('/api/v1/accounts/expenses', token, 'POST', {
      category: 'NOT_A_CATEGORY', amountMinor: 100,
    });
    check('an unknown category is a 400', badCat.status === 400, `${badCat.status}`);
    const extra = await api('/api/v1/accounts/expenses', token, 'POST', {
      category: CATEGORY_IDS[0], amountMinor: 100, sneaky: 'field',
    });
    check('an unexpected field is rejected by the strict schema', extra.status === 400, `${extra.status}`);
    const badMonth = await api('/api/v1/accounts/expenses?month=2026-8', token);
    check('a malformed month filter is a 400', badMonth.status === 400, `${badMonth.status}`);

    // ── Entry → approve → reject ──
    console.log('\nentry, approval and rejection over HTTP');
    const created = await api('/api/v1/accounts/expenses', token, 'POST', {
      category: CATEGORY_IDS[0],
      amountMinor: 123400,
      title: `HTTP verification claim ${marker}`,
      vendor: `Http Vendor ${marker}`,
      paymentMethod: 'UPI',
      paymentReference: `HTTP-${marker}`,
      note: 'fixture',
    });
    check('POST /expenses creates a claim', created.status === 201, `${created.status}`);
    const expenseId = created.json?.data?.id;
    check('the created claim returns its id', !!expenseId);
    check('the created claim starts PENDING', created.json?.data?.status === 'PENDING');
    check('the created claim reports rupees', created.json?.data?.amountRupees === 1234,
      `${created.json?.data?.amountRupees}`);
    createdExpenseIds.push(expenseId);

    const approved = await api(`/api/v1/accounts/expenses/${expenseId}/approve`, token, 'POST');
    check('approving responds 200', approved.status === 200, `${approved.status}`);
    check('approving returns APPROVED', approved.json?.data?.status === 'APPROVED');
    const twice = await api(`/api/v1/accounts/expenses/${expenseId}/approve`, token, 'POST');
    check('approving twice is a 409', twice.status === 409, `${twice.status}`);

    const e2 = await api('/api/v1/accounts/expenses', token, 'POST', {
      category: CATEGORY_IDS[1], amountMinor: 50000, title: `Reject me ${marker}`,
      paymentReference: `HTTP-R-${marker}`,
    });
    createdExpenseIds.push(e2.json?.data?.id);

    const noReason = await api(`/api/v1/accounts/expenses/${e2.json?.data?.id}/reject`, token, 'POST', {});
    check('rejecting without a reason is a 400', noReason.status === 400, `${noReason.status}`);
    const rejected = await api(
      `/api/v1/accounts/expenses/${e2.json?.data?.id}/reject`, token, 'POST',
      { reason: 'Bought centrally under PO 9912.' },
    );
    check('rejecting with a reason responds 200', rejected.status === 200, `${rejected.status}`);
    check('the rejection reason comes back',
      rejected.json?.data?.rejectionReason === 'Bought centrally under PO 9912.');
    const reopened = await api(`/api/v1/accounts/expenses/${e2.json?.data?.id}/reopen`, token, 'POST');
    check('reopening responds 200', reopened.status === 200, `${reopened.status}`);
    check('a reopened claim is PENDING again', reopened.json?.data?.status === 'PENDING');

    // ── Real multipart receipt upload ──
    console.log('\nreceipt upload (real multipart)');
    const e3 = await api('/api/v1/accounts/expenses', token, 'POST', {
      category: CATEGORY_IDS[2], amountMinor: 88000, title: `Needs a receipt ${marker}`,
      paymentReference: `HTTP-D-${marker}`,
    });
    createdExpenseIds.push(e3.json?.data?.id);
    const docRoute = `/api/v1/accounts/expenses/${e3.json?.data?.id}/documents`;

    const pdfBytes = '%PDF-1.4\n% verification receipt\n';
    const up = await upload(docRoute, token, { kind: 'RECEIPT' },
      { name: 'receipt.pdf', type: 'application/pdf', body: pdfBytes });
    check('a PDF receipt uploads', up.status === 201, `${up.status} ${up.json?.error?.message ?? ''}`);
    check('the upload returns a document id', !!up.json?.data?.id);
    check('the upload returns the original filename',
      up.json?.data?.originalName === 'receipt.pdf', up.json?.data?.originalName);
    check('the upload returns the mime type',
      up.json?.data?.mimeType === 'application/pdf');
    check('the upload returns a fetchable url',
      typeof up.json?.data?.url === 'string' && up.json.data.url.startsWith('/uploads/'),
      up.json?.data?.url);
    if (up.json?.data?.fileId) createdFileIds.push(up.json.data.fileId);

    // The file must ACTUALLY be retrievable, not just recorded.
    const fetched = await fetch(`${BASE}${up.json?.data?.url}`);
    check('the uploaded receipt is really served back', fetched.status === 200, `${fetched.status}`);
    const body = await fetched.text();
    check('the served bytes are the bytes uploaded', body.includes('verification receipt'));

    // The stored filename must not be the client's.
    check('the stored name is not the client filename',
      !up.json?.data?.url.endsWith('receipt.pdf'), up.json?.data?.url);
    const storedName = up.json?.data?.url.split('/').pop()!;
    if (existsSync(path.join(UPLOAD_DIR, storedName))) uploadedPaths.push(path.join(UPLOAD_DIR, storedName));

    const dupUpload = await upload(docRoute, token, { kind: 'INVOICE' },
      { name: 'other.pdf', type: 'application/pdf', body: '%PDF-1.4 other' });
    check('a second distinct document uploads', dupUpload.status === 201, `${dupUpload.status}`);
    if (dupUpload.json?.data?.fileId) createdFileIds.push(dupUpload.json.data.fileId);
    if (dupUpload.json?.data?.url) {
      const p = path.join(UPLOAD_DIR, dupUpload.json.data.url.split('/').pop()!);
      if (existsSync(p)) uploadedPaths.push(p);
    }

    const badMime = await upload(docRoute, token, { kind: 'RECEIPT' },
      { name: 'payload.exe', type: 'application/x-msdownload', body: 'MZ...' });
    check('an executable is refused as a receipt', badMime.status === 422 || badMime.status === 400,
      `${badMime.status}`);
    const badKind = await upload(docRoute, token, { kind: 'NOT_A_KIND' },
      { name: 'ok.pdf', type: 'application/pdf', body: '%PDF' });
    check('an unknown document kind is refused', badKind.status === 400, `${badKind.status}`);

    const noFile = await fetch(`${BASE}${docRoute}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: new FormData(),
    });
    check('uploading with no file is a 400', noFile.status === 400, `${noFile.status}`);

    // An image receipt — the common case on a phone.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    const imgRoute = `/api/v1/accounts/expenses/${expenseId}/documents`;
    const fdImg = new FormData();
    fdImg.append('file', new Blob([png], { type: 'image/png' }), 'snap.png');
    const imgRes = await fetch(`${BASE}${imgRoute}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fdImg,
    });
    check('a PNG receipt uploads', imgRes.status === 201, `${imgRes.status}`);
    const imgJson = (await imgRes.json()) as any;
    if (imgJson?.data?.fileId) createdFileIds.push(imgJson.data.fileId);
    if (imgJson?.data?.url) {
      const p = path.join(UPLOAD_DIR, imgJson.data.url.split('/').pop()!);
      if (existsSync(p)) uploadedPaths.push(p);
    }

    const noAuthUpload = await fetch(`${BASE}${docRoute}`, { method: 'POST', body: new FormData() });
    check('uploading without a token is 401', noAuthUpload.status === 401, `${noAuthUpload.status}`);

    // Detach
    console.log('\ndetaching a receipt');
    const detail = await api(`/api/v1/accounts/expenses/${e3.json?.data?.id}`, token);
    check('the claim reports its documents', (detail.json?.data?.expense?.documents?.length ?? 0) === 2,
      `${detail.json?.data?.expense?.documents?.length}`);
    check('the claim reports a receipt', detail.json?.data?.expense?.hasReceipt === true);
    const detach = await api(
      `/api/v1/accounts/expenses/${e3.json?.data?.id}/documents/${up.json?.data?.id}`,
      token, 'DELETE',
    );
    check('detaching responds 200', detach.status === 200, `${detach.status}`);
    const afterDetach = await api(`/api/v1/accounts/expenses/${e3.json?.data?.id}`, token);
    check('the detached document is gone',
      afterDetach.json?.data?.expense?.documents?.length === 1,
      `${afterDetach.json?.data?.expense?.documents?.length}`);
    const detachUnknown = await api(
      `/api/v1/accounts/expenses/${e3.json?.data?.id}/documents/${randomUUID()}`, token, 'DELETE',
    );
    check('detaching an unknown document is a 404', detachUnknown.status === 404, `${detachUnknown.status}`);

    // ── Budgets ──
    console.log('\nbudgets over HTTP');
    const budgets = await api('/api/v1/accounts/expenses/budgets', token);
    check('GET budgets returns lines', Array.isArray(budgets.json?.data?.budgets));
    check('GET budgets returns totals', typeof budgets.json?.data?.totals?.plannedRupees === 'number');
    check('GET budgets returns the fiscal year',
      budgets.json?.data?.fiscalYear === currentFiscalYear(), budgets.json?.data?.fiscalYear);

    const badBudget = await api('/api/v1/accounts/expenses/budgets', token, 'POST', {
      category: 'NOT_A_CATEGORY', plannedMinor: 100,
    });
    check('an unknown budget category is a 400', badBudget.status === 400, `${badBudget.status}`);
    const negBudget = await api('/api/v1/accounts/expenses/budgets', token, 'POST', {
      category: CATEGORY_IDS[0], plannedMinor: -1,
    });
    check('a negative budget is a 400', negBudget.status === 400, `${negBudget.status}`);
    const reconcile = await api('/api/v1/accounts/expenses/budgets/reconcile', token, 'POST');
    check('POST budgets/reconcile responds 200', reconcile.status === 200, `${reconcile.status}`);
    check('reconcile reports what it checked',
      typeof reconcile.json?.data?.checked === 'number', `${reconcile.json?.data?.checked}`);

    // ── Trends, vendors, departments ──
    console.log('\ntrends, vendors and departments');
    const trends = await api('/api/v1/accounts/expenses/trends?months=12', token);
    check('GET trends returns 12 months', trends.json?.data?.months?.length === 12,
      `${trends.json?.data?.months?.length}`);
    check('GET trends returns totals', typeof trends.json?.data?.totals?.approvedRupees === 'number');
    const shortTrend = await api('/api/v1/accounts/expenses/trends?months=1', token);
    check('a trend window below the minimum is a 400', shortTrend.status === 400, `${shortTrend.status}`);

    const vendors = await api('/api/v1/accounts/expenses/vendors', token);
    check('GET vendors returns a list', Array.isArray(vendors.json?.data?.vendors));
    check('GET vendors returns concentration totals',
      typeof vendors.json?.data?.totals?.topVendorSharePercent === 'number');
    const ourVendor = vendors.json?.data?.vendors?.find((v: any) => v.vendor === `Http Vendor ${marker}`);
    check('a vendor created over HTTP appears in the roll-up', !!ourVendor);

    const depts = await api('/api/v1/accounts/expenses/departments', token);
    check('GET departments returns groups', Array.isArray(depts.json?.data?.groups));
    check('GET departments returns the fiscal year',
      depts.json?.data?.fiscalYear === currentFiscalYear());

    // ── Cross-tenant ──
    console.log('\ntenancy over HTTP');
    const other = await prisma.institution.findFirst({ where: { id: { not: instId } } });
    if (other) {
      const otherUser = await prisma.user.findFirst({ where: { institutionId: other.id, deletedAt: null } });
      if (otherUser) {
        const otherToken = jwt.sign(
          { sub: otherUser.id, institutionId: other.id, roles: ['ACCOUNTS'] },
          env.jwtAccessSecret, { expiresIn: '1h' },
        );
        const r1 = await api(`/api/v1/accounts/expenses/${expenseId}`, otherToken);
        check("another institution cannot read the claim", r1.status === 404, `${r1.status}`);
        const r2 = await api(`/api/v1/accounts/expenses/${expenseId}/approve`, otherToken, 'POST');
        check("another institution cannot approve the claim", r2.status === 404, `${r2.status}`);
        const r3 = await upload(
          `/api/v1/accounts/expenses/${expenseId}/documents`, otherToken, {},
          { name: 'x.pdf', type: 'application/pdf', body: '%PDF' },
        );
        check("another institution cannot attach a receipt", r3.status === 404, `${r3.status}`);
        const r4 = await api('/api/v1/accounts/expenses', otherToken);
        check("another institution sees none of these claims",
          !r4.json?.data?.expenses?.some((e: any) => e.id === expenseId));
      }
    }

    // ── Filter coverage over HTTP ──
    console.log('\nfilters over HTTP');
    for (const [q, label] of [
      ['?status=APPROVED', 'status'],
      [`?month=${monthKey(new Date())}`, 'month'],
      [`?q=HTTP-${marker}`, 'search'],
      ['?missingReceipt=true', 'missing receipt'],
      ['?category=MISC', 'category'],
    ] as Array<[string, string]>) {
      const r = await api(`/api/v1/accounts/expenses${q}`, token);
      check(`the ${label} filter responds 200`, r.status === 200, `${r.status}`);
      check(`the ${label} filter returns stats`, typeof r.json?.data?.stats?.totalRupees === 'number');
    }

  } finally {
    for (const p of uploadedPaths) { try { unlinkSync(p); } catch { /* already gone */ } }
    await prisma.expenseDocument.deleteMany({ where: { expenseId: { in: createdExpenseIds } } }).catch(() => {});
    await prisma.expense.deleteMany({ where: { id: { in: createdExpenseIds } } }).catch(() => {});
    await prisma.file.deleteMany({ where: { id: { in: createdFileIds } } }).catch(() => {});
    // Repair any budget this run's approvals moved.
    const budgetsLeft = await prisma.budget.findMany({ where: { institutionId: instId }, select: { id: true } });
    for (const b of budgetsLeft) {
      const agg = await prisma.expense.aggregate({
        where: { budgetId: b.id, institutionId: instId, status: 'APPROVED' },
        _sum: { amountMinor: true },
      });
      await prisma.budget.update({
        where: { id: b.id }, data: { spentMinor: agg._sum.amountMinor ?? 0 },
      }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

run()
  .then(() => {
    console.log(`\n${passed} passed, ${failed} failed`);
    if (fails.length) {
      console.log('\nFailures:');
      fails.forEach((f) => console.log(`  - ${f}`));
    }
    server.close();
    process.exit(failed ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    server.close();
    process.exit(1);
  });
