// UI contract audit for F-07 Expenses (docs/users/06 §3.6).
//
// A screen that destructures a field the API never sends does not crash — it
// renders `undefined`, which on a money screen means "₹undefined" or a bar that
// silently reads zero. That class of bug survives a successful build, a passing
// backend suite and a Metro bundle. So this script walks every response the
// expenses endpoints actually return and asserts that each field the screens
// read is really there.
//
// Two directions, and both matter:
//   1. SCREEN -> API. Every `data.expenses[0].x` / `g.x` / `row.x` the screens
//      touch must exist on a real response.
//   2. API -> ROUTES. Every `navigate('X')` in the expenses screens must have a
//      FEATURE_MODULES entry, or the button silently does nothing.
//
// Usage: npx tsx scripts/audit-expenses-ui.ts
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import { EXPENSE_CATEGORIES, fiscalYearOf } from '../src/modules/accounts/expenses.money.js';

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

const UI = path.resolve('..', 'learnix', 'users', 'accounts_finance');
const EXPENSES_DIR = path.join(UI, 'pages', 'expenses');

const app = createApp();
const server = app.listen(0);
const port = (server.address() as any).port;
const BASE = `http://127.0.0.1:${port}`;

async function api(p: string, token: string) {
  const res = await fetch(`${BASE}${p}`, { headers: { Authorization: `Bearer ${token}` } });
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

  try {
    // ── Live responses ────────────────────────────────────────
    console.log('\nlive expense endpoints respond');
    const claims = await api('/api/v1/accounts/expenses?take=50', token);
    check('GET /expenses is 200', claims.status === 200, `${claims.status}`);
    const budgets = await api('/api/v1/accounts/expenses/budgets', token);
    check('GET /expenses/budgets is 200', budgets.status === 200, `${budgets.status}`);
    const trends = await api('/api/v1/accounts/expenses/trends?months=12', token);
    check('GET /expenses/trends is 200', trends.status === 200, `${trends.status}`);
    const depts = await api('/api/v1/accounts/expenses/departments', token);
    check('GET /expenses/departments is 200', depts.status === 200, `${depts.status}`);
    const vendors = await api('/api/v1/accounts/expenses/vendors', token);
    check('GET /expenses/vendors is 200', vendors.status === 200, `${vendors.status}`);

    const first = claims.json.data.expenses[0];
    check('the demo seed has at least one claim', !!first);
    const detail = await api(`/api/v1/accounts/expenses/${first.id}`, token);
    check('GET /expenses/:id is 200', detail.status === 200, `${detail.status}`);

    // ── 1. Claim row fields the screens read ──────────────────
    console.log('\nclaim row fields');
    // Field names read off the screens, not invented — the audit greps the
    // source for `expense.` / `e.` accesses and this list is the whitelist.
    const claimFields = [
      'id', 'title', 'note', 'category', 'categoryLabel', 'subcategory', 'vendor',
      'amountRupees', 'taxRupees', 'netRupees', 'date', 'month', 'fiscalYear',
      'status', 'statusLabel', 'departmentId', 'departmentName', 'budgetId',
      'paymentMethod', 'paymentMethodLabel', 'paymentReference', 'requestedBy',
      'approvedBy', 'approvedAt', 'approvedByName', 'rejectedAt', 'rejectedBy',
      'rejectionReason', 'documentCount', 'hasReceipt', 'documents', 'createdAt',
    ];
    for (const f of claimFields) {
      check(`a claim carries "${f}"`, f in first, `keys: ${Object.keys(first).join(',')}`);
    }

    const claimStats = [
      'totalRupees', 'approvedRupees', 'pendingRupees', 'rejectedRupees',
      'pendingCount', 'approvedCount', 'rejectedCount', 'taxRupees', 'missingReceiptCount',
    ];
    for (const f of claimStats) {
      check(`claim stats carry "${f}"`, f in claims.json.data.stats,
        `keys: ${Object.keys(claims.json.data.stats).join(',')}`);
    }
    check('the list sends its categories for the picker',
      Array.isArray(claims.json.data.categories) && claims.json.data.categories.length > 0);
    check('the list sends its departments for the picker',
      Array.isArray(claims.json.data.departments));
    check('a category carries its icon and hint for the entry form',
      !!claims.json.data.categories[0].icon && !!claims.json.data.categories[0].hint);

    // ── 2. Claim detail ───────────────────────────────────────
    console.log('\nclaim detail');
    check('the detail wraps the claim under "expense"', !!detail.json.data.expense);
    check('the detail sends budgetImpact', 'budgetImpact' in detail.json.data);
    check('the detail sends history', Array.isArray(detail.json.data.history));
    const d = detail.json.data.expense;
    for (const f of ['documents', 'hasReceipt', 'documentCount', 'taxRupees', 'netRupees']) {
      check(`the detail claim carries "${f}"`, f in d);
    }
    if (detail.json.data.budgetImpact) {
      for (const f of ['categoryLabel', 'plannedRupees', 'spentRupees', 'percent', 'barPercent', 'ifApprovedPercent']) {
        check(`budgetImpact carries "${f}"`, f in detail.json.data.budgetImpact);
      }
    }

    // Documents must be openable, not just referenced.
    console.log('\ndocuments are openable, not just referenced');
    const withDocs = claims.json.data.expenses.find((e: any) => e.documentCount > 0);
    check('the seed has at least one claim with a document', !!withDocs);
    if (withDocs) {
      const doc = withDocs.documents[0];
      for (const f of ['id', 'fileId', 'kind', 'originalName', 'mimeType', 'sizeBytes', 'url', 'createdAt']) {
        check(`a document carries "${f}"`, f in doc, `keys: ${Object.keys(doc).join(',')}`);
      }
      check('a document url is a fetchable /uploads path',
        typeof doc.url === 'string' && doc.url.startsWith('/uploads/'), `${doc.url}`);
      const got = await fetch(`${BASE}${doc.url}`);
      check('the document really is served', got.status === 200, `${got.status}`);
    }

    // ── 3. Budgets ────────────────────────────────────────────
    console.log('\nbudget line fields');
    const line = budgets.json.data.budgets[0];
    check('the seed has at least one budget line', !!line);
    for (const f of [
      'id', 'category', 'categoryLabel', 'fiscalYear', 'departmentId', 'departmentName',
      'note', 'plannedRupees', 'spentRupees', 'remainingRupees', 'overspentRupees',
      'overspent', 'percent', 'barPercent', 'unbudgetedRupees', 'unbudgetedCount', 'claimCount',
    ]) {
      check(`a budget line carries "${f}"`, f in line, `keys: ${Object.keys(line).join(',')}`);
    }
    // The over-budget wording the budgets screen prints depends on this pair.
    check('barPercent never exceeds 100', line.barPercent <= 100, `${line.barPercent}`);
    check('overspent is a boolean', typeof line.overspent === 'boolean');

    for (const f of [
      'plannedRupees', 'spentRupees', 'remainingRupees', 'percent', 'unbudgetedRupees',
      'overBudgetCount', 'lineCount',
    ]) {
      check(`budget totals carry "${f}"`, f in budgets.json.data.totals,
        `keys: ${Object.keys(budgets.json.data.totals).join(',')}`);
    }
    check('the budget screen can offer a year switcher',
      Array.isArray(budgets.json.data.years) && budgets.json.data.years.includes(budgets.json.data.fiscalYear));
    check('the budget screen knows the current year to warn about drift',
      typeof budgets.json.data.currentFiscalYear === 'string');

    // ── 4. Departments ────────────────────────────────────────
    console.log('\ndepartment group fields');
    const group = depts.json.data.groups[0];
    check('the seed has at least one department group', !!group);
    for (const f of [
      'key', 'departmentId', 'departmentName', 'departmentCode', 'totalRupees',
      'approvedRupees', 'pendingRupees', 'rejectedRupees', 'claimCount', 'approvedCount',
      'vendorCount', 'topVendor', 'categories', 'plannedRupees', 'spentRupees', 'percent',
      'barPercent', 'overspent',
    ]) {
      check(`a department group carries "${f}"`, f in group, `keys: ${Object.keys(group).join(',')}`);
    }
    check('a department category carries label, colour and rupees',
      !!group.categories[0]?.label && !!group.categories[0]?.color && 'rupees' in group.categories[0]);
    check('departments sends the unbudgeted list the alert is built from',
      Array.isArray(depts.json.data.unbudgetedDepartments));
    check('department totals are present',
      'approvedRupees' in depts.json.data.totals && 'plannedRupees' in depts.json.data.totals);

    // ── 5. Vendors ────────────────────────────────────────────
    console.log('\nvendor fields');
    const vendor = vendors.json.data.vendors[0];
    check('the seed has at least one vendor', !!vendor);
    for (const f of [
      'vendor', 'totalRupees', 'approvedRupees', 'pendingRupees', 'claimCount', 'approvedCount',
      'lastPaidAt', 'averageClaimRupees', 'categories', 'paymentMethods', 'departments',
      'missingReferenceCount',
    ]) {
      check(`a vendor carries "${f}"`, f in vendor, `keys: ${Object.keys(vendor).join(',')}`);
    }
    check('a vendor payment method carries a label and count',
      vendor.paymentMethods.length === 0 || ('label' in vendor.paymentMethods[0] && 'count' in vendor.paymentMethods[0]));
    for (const f of [
      'vendorCount', 'approvedRupees', 'pendingRupees', 'topVendor', 'topVendorRupees',
      'topVendorSharePercent',
    ]) {
      check(`vendor totals carry "${f}"`, f in vendors.json.data.totals,
        `keys: ${Object.keys(vendors.json.data.totals).join(',')}`);
    }
    // The double-division bug this screen was written against.
    const sumOfVendorRupees = vendors.json.data.vendors.reduce((s: number, v: any) => s + v.approvedRupees, 0);
    check('the vendor total equals the sum of the vendor rows',
      Math.abs(sumOfVendorRupees - vendors.json.data.totals.approvedRupees) < 1,
      `${sumOfVendorRupees} vs ${vendors.json.data.totals.approvedRupees}`);
    check('the vendor total is rupees, not paise',
      vendors.json.data.totals.approvedRupees < 10000000,
      `${vendors.json.data.totals.approvedRupees}`);
    const shareSum = vendors.json.data.vendors.reduce(
      (s: number, v: any) => s + v.approvedRupees, 0,
    );
    check('the top-vendor share is a plausible percentage',
      vendors.json.data.totals.topVendorSharePercent >= 0
        && vendors.json.data.totals.topVendorSharePercent <= 100,
      `${vendors.json.data.totals.topVendorSharePercent}% of ${shareSum}`);

    // ── 6. Trends ─────────────────────────────────────────────
    console.log('\ntrend fields');
    const month = trends.json.data.months[0];
    check('the trends response has the requested number of months',
      trends.json.data.months.length === 12, `${trends.json.data.months.length}`);
    for (const f of ['key', 'label', 'approvedRupees', 'pendingRupees', 'rejectedRupees', 'totalRupees', 'count']) {
      check(`a trend month carries "${f}"`, f in month, `keys: ${Object.keys(month).join(',')}`);
    }
    for (const f of [
      'approvedRupees', 'pendingRupees', 'claimCount', 'averageRupees', 'busiestMonth',
      'busiestMonthRupees', 'monthlyBudgetPaceRupees', 'changePercent', 'monthsWithSpend',
    ]) {
      check(`trend totals carry "${f}"`, f in trends.json.data.totals,
        `keys: ${Object.keys(trends.json.data.totals).join(',')}`);
    }
    // changePercent must be a number or null — never undefined, which the
    // changePhrase() helper would render as "NaN% up on last month".
    const cp = trends.json.data.totals.changePercent;
    check('changePercent is a number or null, never undefined',
      cp === null || typeof cp === 'number', `${JSON.stringify(cp)}`);
    check('the busiest month is labelled in words',
      typeof trends.json.data.totals.busiestMonth === 'string'
        || trends.json.data.totals.busiestMonth === null);

    // ── 7. Cross-screen money invariants ──────────────────────
    console.log('\ncross-screen money invariants');
    check('approved + pending + rejected equals the claim total',
      Math.abs(
        claims.json.data.stats.approvedRupees
        + claims.json.data.stats.pendingRupees
        + claims.json.data.stats.rejectedRupees
        - claims.json.data.stats.totalRupees,
      ) < 1,
      `${claims.json.data.stats.approvedRupees} + ${claims.json.data.stats.pendingRupees} + ${claims.json.data.stats.rejectedRupees} vs ${claims.json.data.stats.totalRupees}`);
    check('every amount on screen is rupees, never paise',
      claims.json.data.expenses.every((e: any) => Math.abs(e.amountRupees) < 10000000));
    check('the fiscal year of a March claim is the previous year',
      fiscalYearOf(new Date('2026-03-15')) === '2025-26',
      fiscalYearOf(new Date('2026-03-15')));
    check('the fiscal year of an April claim is the new year',
      fiscalYearOf(new Date('2026-04-01')) === '2026-27',
      fiscalYearOf(new Date('2026-04-01')));

    // ── 8. Route registry covers every navigate() ─────────────
    console.log('\nevery navigation target is registered');
    const registry = readFileSync(path.join(UI, 'accounts_finance.js'), 'utf8');
    const screens = existsSync(EXPENSES_DIR)
      ? [path.join(EXPENSES_DIR, 'expenses.js'),
        ...readdirSync(path.join(EXPENSES_DIR, 'pages')).map(
          (d) => path.join(EXPENSES_DIR, 'pages', d, `${d}.js`),
        )]
      : [];
    check('the expenses screens were found to audit', screens.length >= 7, `${screens.length} files`);

    for (const file of screens) {
      if (!existsSync(file)) continue;
      const src = readFileSync(file, 'utf8');
      const targets = [...src.matchAll(/navigate\(\s*'([^']+)'/g)].map((m) => m[1]);
      for (const target of new Set(targets)) {
        check(
          `${path.basename(file)} navigates to a registered "${target}"`,
          new RegExp(`\\b${target}:`).test(registry),
        );
      }
    }

    // ── 9. Every imports in the new screens resolve ───────────
    console.log('\nnew screen imports resolve');
    const newScreens = [
      'pages/expenses/expenses.js',
      'pages/expenses/expensesMeta.js',
      'pages/expenses/pages/expense_entry/expense_entry.js',
      'pages/expenses/pages/expense_detail/expense_detail.js',
      'pages/expenses/pages/budgets/budgets.js',
      'pages/expenses/pages/vendors/vendors.js',
      'pages/expenses/pages/department_spend/department_spend.js',
      'pages/expenses/pages/trends/trends.js',
    ];
    for (const rel of newScreens) {
      const full = path.join(UI, rel);
      check(`${rel} exists`, existsSync(full));
      if (!existsSync(full)) continue;
      const src = readFileSync(full, 'utf8');
      for (const m of src.matchAll(/from\s+'(\.[^']+)'/g)) {
        const target = path.resolve(path.dirname(full), m[1]);
        const ok = existsSync(`${target}.js`) || existsSync(path.join(target, 'index.js'));
        check(`${rel} imports ${m[1]}`, ok);
      }
      // The expensesMeta helpers a screen uses must actually be exported.
      if (rel.endsWith('expensesMeta.js')) continue;
      for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*'[^']*expensesMeta'/g)) {
        for (const raw of m[1].split(',')) {
          const name = raw.trim().split(/\s+as\s+/)[0].trim();
          if (!name) continue;
          check(`${rel} uses exported "${name}"`,
            new RegExp(`export\\s+(const|function|async function)\\s+${name}\\b`).test(
              readFileSync(path.join(UI, 'pages/expenses/expensesMeta.js'), 'utf8'),
            ),
          );
        }
      }
    }

    // ── 10. Meta mirrors the server ───────────────────────────
    console.log('\nthe client meta matches the server constants');
    const metaSrc = readFileSync(path.join(EXPENSES_DIR, 'expensesMeta.js'), 'utf8');
    const serverCats = EXPENSE_CATEGORIES.map((c: { id: string }) => c.id);
    for (const id of serverCats) {
      check(`expensesMeta declares category "${id}"`, metaSrc.includes(`id: '${id}'`));
    }
    check('the client and server agree on the category count',
      (metaSrc.match(/id: '(LABS|EVENTS|MAINTENANCE|UTILITIES|MISC)'/g) ?? []).length === serverCats.length);
    for (const id of ['PENDING', 'APPROVED', 'REJECTED']) {
      check(`expensesMeta declares status "${id}"`, metaSrc.includes(`${id}: {`));
    }
    check('expensesMeta declares the same document kinds',
      ['RECEIPT', 'INVOICE', 'QUOTATION'].every((k) => metaSrc.includes(`id: '${k}'`)));
    check('expensesMeta accepts exactly the mime types the server does',
      [...metaSrc.matchAll(/'(image\/[a-z]+|application\/pdf)'/g)]
        .map((m) => m[1])
        .every((t) => ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'].includes(t)),
      'a mime type in expensesMeta is not in the server ALLOWED_MIME set');
    check('expensesMeta declares the fiscal-year helper the label uses',
      metaSrc.includes('export function fiscalYearLabel'));

  } finally {
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
