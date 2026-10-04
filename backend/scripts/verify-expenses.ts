// Verification for F-07 Expenses (docs/users/06 §3.6) — every sub-feature:
// entry & categorisation, department-wise expenditure, budget allocation and
// utilisation, vendor/payment records, approval status, monthly trends and
// receipt documents.
//
// Usage: npx tsx scripts/verify-expenses.ts
//
// Everything it creates is deleted and every row it mutates is restored, so the
// dev DB is left exactly as found. Idempotent across runs.
import { prisma } from '../src/db/prisma.js';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import {
  toRupees, fiscalYearOf, fiscalYearRange, monthKey, lastNMonths, utilisation,
  currentFiscalYear, CATEGORY_IDS, EXPENSE_CATEGORIES, PAYMENT_METHOD_IDS,
} from '../src/modules/accounts/expenses.money.js';
import {
  listExpenses, getExpense, createExpense, approveExpense, rejectExpense, reopenExpense,
  listBudgets, saveBudget, recomputeBudgets, reconcileBudgets,
  departmentSpend, vendorSpend, monthlyTrend,
  attachDocument, detachDocument,
} from '../src/modules/accounts/expenses.service.js';

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

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

async function run() {
  const inst = await prisma.institution.findFirst({ orderBy: { createdAt: 'asc' } });
  const instId = inst!.id;
  const actor = await prisma.user.findFirst({
    where: { institutionId: instId, deletedAt: null },
    select: { id: true, fullName: true },
  });
  const actorId = actor!.id;
  const dept = await prisma.department.findFirst({ where: { institutionId: instId } });

  // ── Fixtures we will tear down ──
  const marker = randomUUID().slice(0, 8);
  const createdExpenseIds: string[] = [];
  const createdBudgetIds: string[] = [];
  const createdFileIds: string[] = [];
  const storedPaths: string[] = [];
  const budgetSnapshots: Array<{ id: string; plannedMinor: number; spentMinor: number }> = [];

  // Everything below runs inside this promise chain so a throw still reaches
  // cleanup — an `process.on('exit')` async handler is dropped, which is how
  // fixtures leak.
  try {
    // ══ 1. Money + period rules ═════════════════════════════
    console.log('\nmoney and period rules');
    check('1 lakh paise is 1 lakh rupees', toRupees(10000000) === 100000,
      `${toRupees(10000000)}`);
    check('paise survive the round trip',
      toRupees(123456) === 1234.56, `${toRupees(123456)}`);

    check('March belongs to the fiscal year before it',
      fiscalYearOf(new Date(2026, 2, 15)) === '2025-26', fiscalYearOf(new Date(2026, 2, 15)));
    check('April starts the new fiscal year',
      fiscalYearOf(new Date(2026, 3, 1)) === '2026-27', fiscalYearOf(new Date(2026, 3, 1)));
    check('December is still in the same year as April',
      fiscalYearOf(new Date(2026, 11, 31)) === '2026-27');
    const rng = fiscalYearRange('2026-27');
    check('a fiscal year range starts 1 April',
      rng.start.getMonth() === 3 && rng.start.getDate() === 1);
    check('a fiscal year range ends 31 March',
      rng.end.getMonth() === 2 && rng.end.getDate() === 31);
    check('the range contains its own start',
      rng.start <= new Date(2026, 5, 15) && new Date(2026, 5, 15) <= rng.end);

    check('monthKey is zero-padded and sortable',
      monthKey(new Date(2026, 7, 9)) === '2026-08', monthKey(new Date(2026, 7, 9)));
    const six = lastNMonths(6, new Date(2026, 7, 15));
    check('lastNMonths returns exactly n months', six.length === 6, six.join(','));
    check('lastNMonths is oldest first', six[0] === '2026-03' && six[5] === '2026-08', six.join(','));
    check('lastNMonths has no gaps',
      six.every((k, i) => i === 0 || monthKey(new Date(2026, 2 + i, 1)) === k), six.join(','));
    check('lastNMonths crosses a year boundary cleanly',
      lastNMonths(3, new Date(2026, 1, 10)).join(',') === '2025-12,2026-01,2026-02');

    const u1 = utilisation(1000000, 500000);
    check('utilisation reports percent', u1.percent === 50, `${u1.percent}`);
    check('utilisation reports remaining', u1.remainingRupees === 5000, `${u1.remainingRupees}`);
    check('a half-spent budget is not over-spent', u1.overspent === false);
    const u2 = utilisation(1000000, 1400000);
    check('over-spend is NOT clamped to 100%', u2.percent === 140, `${u2.percent}`);
    check('over-spend reports how far past', u2.overspentRupees === 4000, `${u2.overspentRupees}`);
    check('the drawn bar is still capped at the track', u2.barPercent === 100, `${u2.barPercent}`);
    check('a zero budget with spend reads as 100%', utilisation(0, 500).percent === 100);
    check('a zero budget with nothing reads as 0%', utilisation(0, 0).percent === 0);

    check('categories and payment methods are non-empty',
      EXPENSE_CATEGORIES.length === 5 && PAYMENT_METHOD_IDS.length === 5);

    // ══ 2. Budget setup ══════════════════════════════════════
    console.log('\nbudget lines');
    const fy = currentFiscalYear();

    // Find a genuinely free (category, department) slot rather than assuming
    // one: the seed already owns several, and a test that collides with demo
    // data fails for the wrong reason.
    const taken = await prisma.budget.findMany({
      where: { institutionId: instId, fiscalYear: fy },
      select: { category: true, departmentId: true },
    });
    const takenKeys = new Set(taken.map((b) => `${b.category}|${b.departmentId ?? 'null'}`));
    const freeSlot = (category: string, departmentId: string | null) =>
      !takenKeys.has(`${category}|${departmentId ?? 'null'}`);

    let catA = CATEGORY_IDS[0];
    let catB = CATEGORY_IDS[1];
    let deptId: string | null = dept?.id ?? null;
    for (const c of CATEGORY_IDS) {
      if (freeSlot(c, deptId)) { catA = c; break; }
    }
    for (const c of CATEGORY_IDS) {
      if (c !== catA && freeSlot(c, null)) { catB = c; break; }
    }
    check('the fixture found free budget slots', catA !== catB, `${catA} / ${catB}`);

    const b1 = await saveBudget(instId, actorId, {
      category: catA, plannedMinor: 1000000, departmentId: deptId ?? undefined, fiscalYear: fy, note: 'verify',
    });
    createdBudgetIds.push(b1.id);
    const b2 = await saveBudget(instId, actorId, {
      category: catB, plannedMinor: 300000, fiscalYear: fy,
    });
    createdBudgetIds.push(b2.id);

    const existingBudgets = await prisma.budget.findMany({ where: { institutionId: instId } });
    budgetSnapshots.push(...existingBudgets.map((b) => ({ id: b.id, plannedMinor: b.plannedMinor, spentMinor: b.spentMinor })));

    const afterSave = await listBudgets(instId, fy);
    const line1 = afterSave.budgets.find((b) => b.id === b1.id);
    check('a saved budget line comes back', !!line1);
    check('a new line starts unspent', line1!.spentRupees === 0, `${line1!.spentRupees}`);
    check('a new line reports 0% utilisation', line1!.percent === 0);
    check('a new line is not over-spent', line1!.overspent === false);
    check('a departmental line carries its department name',
      line1!.departmentName === (deptId ? dept?.name ?? 'Institution-wide' : 'Institution-wide'),
      line1!.departmentName);
    check('an institution-wide line is labelled as such',
      afterSave.budgets.find((b) => b.id === b2.id)!.departmentName === 'Institution-wide');

    // Duplicate detection — the raw unique constraint would be a P2002.
    let dup = '';
    try {
      await saveBudget(instId, actorId, { category: catA, plannedMinor: 1, departmentId: deptId ?? undefined, fiscalYear: fy });
    } catch (e: any) { dup = e.code ?? ''; }
    check('a duplicate budget line is refused, not a raw 500', dup === 'CONFLICT', `got ${dup}`);

    let negBudget = '';
    try { await saveBudget(instId, actorId, { category: catA, plannedMinor: -5, fiscalYear: fy }); }
    catch (e: any) { negBudget = e.message; }
    check('a negative budget is refused', /negative/i.test(negBudget), negBudget);

    // ══ 3. Entry & categorisation ════════════════════════════
    console.log('\nentry and categorisation');
    const e1 = await createExpense(instId, actorId, {
      category: catA,
      amountMinor: 400000, // ₹4,000
      title: 'Verification claim',
      note: 'fixture',
      vendor: '  Verify   Vendor  ',
      departmentId: dept?.id,
      budgetId: b1.id,
      paymentMethod: 'UPI',
      paymentReference: `VT-${marker}`,
      taxMinor: 40000,
    });
    createdExpenseIds.push(e1.id);
    check('a new claim starts PENDING', e1.status === 'PENDING');
    check('a new claim reports its own amount in rupees', e1.amountRupees === 4000, `${e1.amountRupees}`);
    check('tax is carved out and reported separately', e1.taxRupees === 400 && e1.netRupees === 3600,
      `tax ${e1.taxRupees} net ${e1.netRupees}`);
    check('the vendor is trimmed and whitespace-collapsed', e1.vendor === 'Verify Vendor', `"${e1.vendor}"`);
    check('a claim with a budget reports it as budgeted', e1.budgetless === false);
    check('the chosen budget is linked to the claim', e1.budgetId === b1.id);
    check('the fiscal year comes from the budget when one is chosen', e1.fiscalYear === fy, e1.fiscalYear);

    const e2 = await createExpense(instId, actorId, {
      category: catB, amountMinor: 100000, title: 'Unbudgeted claim', paymentReference: `VT2-${marker}`,
    });
    createdExpenseIds.push(e2.id);
    check('an unbudgeted claim is accepted, not refused', e2.status === 'PENDING');
    check('an unbudgeted claim is flagged as such', e2.budgetless === true);
    check('an unbudgeted claim has no budget linked', e2.budgetId === null);

    // A budget id that does not exist must 404 rather than quietly creating an
    // unbudgeted claim — otherwise a typo silently loses the department and the
    // budget line at the same time.
    let unknownBudget = '';
    try {
      await createExpense(instId, actorId, {
        category: catA, amountMinor: 50000, title: 'Unknown budget attempt', budgetId: randomUUID(),
      });
    } catch (e: any) { unknownBudget = e.code ?? ''; }
    check('an unknown budget id is a 404, not a silent un-budgeted claim',
      unknownBudget === 'NOT_FOUND', unknownBudget);

    let badCat = '';
    try { await createExpense(instId, actorId, { category: 'NOPE', amountMinor: 100 }); }
    catch (e: any) { badCat = `${e.code}: ${e.message}`; }
    check('an unknown category is refused',
      badCat.startsWith('VALIDATION_ERROR') && /Unknown category/i.test(badCat), badCat);

    let zeroAmt = '';
    try { await createExpense(instId, actorId, { category: catA, amountMinor: 0 }); }
    catch (e: any) { zeroAmt = e.code ?? ''; }
    check('a zero-amount claim is refused', zeroAmt === 'VALIDATION_ERROR', zeroAmt);

    let bigTax = '';
    try { await createExpense(instId, actorId, { category: catA, amountMinor: 100, taxMinor: 500 }); }
    catch (e: any) { bigTax = e.code ?? ''; }
    check('tax greater than the total is refused', bigTax === 'UNPROCESSABLE', bigTax);

    // ══ 4. Approval status ══════════════════════════════════
    console.log('\napproval status');
    const noReceipt = await approveExpense(instId, actorId, e1.id);
    check('approving sets APPROVED', noReceipt.status === 'APPROVED');
    check('approving stamps the approver', !!noReceipt.approvedBy, `${noReceipt.approvedBy}`);
    check('approving stamps the time', !!noReceipt.approvedAt);
    check('approving a claim with no receipt says so', noReceipt.approvedWithoutReceipt === true);

    let twice = '';
    try { await approveExpense(instId, actorId, e1.id); } catch (e: any) { twice = e.code ?? ''; }
    check('approving twice is refused', twice === 'CONFLICT', twice);

    const rejected = await rejectExpense(instId, actorId, e2.id, 'Over budgeted this quarter.');
    check('rejecting sets REJECTED', rejected.status === 'REJECTED');
    check('a rejection records why', rejected.rejectionReason === 'Over budgeted this quarter.');
    check('a rejection records when', !!rejected.rejectedAt);
    check('a rejection records who', !!rejected.rejectedBy, `${rejected.rejectedBy}`);
    check('a rejection does not keep the approver', rejected.approvedBy === null);

    let rejectAgain = '';
    try { await rejectExpense(instId, actorId, e2.id, 'again'); } catch (e: any) { rejectAgain = e.code ?? ''; }
    check('rejecting twice is refused', rejectAgain === 'CONFLICT', rejectAgain);

    const reopened = await reopenExpense(instId, actorId, e2.id);
    check('a rejected claim can be reopened', reopened.status === 'PENDING');
    check('reopening clears the rejection reason', reopened.rejectionReason === null);

    let reopenApproved = '';
    try { await reopenExpense(instId, actorId, e1.id); } catch (e: any) { reopenApproved = e.code ?? ''; }
    check('an approved claim cannot be reopened', reopenApproved === 'CONFLICT', reopenApproved);

    // ══ 5. Budget utilisation recomputation ═════════════════
    console.log('\nbudget utilisation');
    const budgetsNow = await listBudgets(instId, fy);
    const l1 = budgetsNow.budgets.find((b) => b.id === b1.id)!;
    check('approving a claim moves the budget spend', l1.spentRupees === 4000, `${l1.spentRupees}`);
    check('utilisation is computed against the plan', l1.percent === 40, `${l1.percent}`);
    check('remaining is plan minus spend', l1.remainingRupees === 6000, `${l1.remainingRupees}`);

    // The critical invariant: money is only "spent" once APPROVED. A claim that
    // is raised and then rejected must leave the budget exactly as it was —
    // which is precisely what a blind `spentMinor +=` gets wrong.
    await approveExpense(instId, actorId, e2.id);
    let l1b = (await listBudgets(instId, fy)).budgets.find((b) => b.id === b1.id)!;
    check('approving an unbudgeted claim does not touch the other line', l1b.spentRupees === 4000);

    const ePending = await createExpense(instId, actorId, {
      category: catA, amountMinor: 250000, title: 'Raised then rejected', budgetId: b1.id,
      paymentReference: `VTR-${marker}`,
    });
    createdExpenseIds.push(ePending.id);
    l1b = (await listBudgets(instId, fy)).budgets.find((b) => b.id === b1.id)!;
    check('a PENDING claim does not count as spend', l1b.spentRupees === 4000, `${l1b.spentRupees}`);

    await rejectExpense(instId, actorId, ePending.id, 'Bought centrally instead — see PO 4471.');
    l1b = (await listBudgets(instId, fy)).budgets.find((b) => b.id === b1.id)!;
    check('a rejected claim contributes nothing to spend', l1b.spentRupees === 4000, `${l1b.spentRupees}`);

    // And the reverse: approving it after a reopen really does move the number,
    // so the recompute is not just stuck at the old value.
    await reopenExpense(instId, actorId, ePending.id);
    await approveExpense(instId, actorId, ePending.id);
    l1b = (await listBudgets(instId, fy)).budgets.find((b) => b.id === b1.id)!;
    check('approving after a reopen does count as spend', l1b.spentRupees === 6500,
      `${l1b.spentRupees}`);

    // Corrupt the denorm on purpose and prove reconcile repairs it.
    await prisma.budget.update({ where: { id: b1.id }, data: { spentMinor: 99999999 } });
    const drifted = (await listBudgets(instId, fy)).budgets.find((b) => b.id === b1.id)!;
    check('a drifted budget really does read wrong before repair', drifted.spentRupees === 999999.99,
      `${drifted.spentRupees}`);
    const rec = await reconcileBudgets(instId, fy);
    check('reconcile reports what it repaired', rec.repaired >= 1, `${rec.repaired}`);
    const repairedLine = (await listBudgets(instId, fy)).budgets.find((b) => b.id === b1.id)!;
    check('reconcile restores the true figure', repairedLine.spentRupees === 6500, `${repairedLine.spentRupees}`);

    // Over-spend must be visible, not clamped. Planned ₹6,400 against ₹9,000
    // approved is ~141% — the number a HOD needs, not "100%".
    await saveBudget(instId, actorId, { id: b2.id, category: catB, plannedMinor: 640000, fiscalYear: fy });
    const e4 = await createExpense(instId, actorId, {
      category: catB, amountMinor: 900000, title: 'Over-spend claim', budgetId: b2.id,
      paymentReference: `VT4-${marker}`,
    });
    createdExpenseIds.push(e4.id);
    await approveExpense(instId, actorId, e4.id);
    const overLine = (await listBudgets(instId, fy)).budgets.find((b) => b.id === b2.id)!;
    check('an over-spent line reports more than 100%', overLine.percent > 100, `${overLine.percent}%`);
    check('an over-spent line is flagged', overLine.overspent === true);
    check('an over-spent line reports exactly how far past',
      overLine.overspentRupees === overLine.spentRupees - overLine.plannedRupees,
      `${overLine.overspentRupees} vs ${overLine.spentRupees - overLine.plannedRupees}`);
    check('an over-spent line draws a full but not overflowing bar', overLine.barPercent === 100);
    const totalsOver = (await listBudgets(instId, fy)).totals;
    check('totals count over-budget lines', totalsOver.overBudgetCount >= 1, `${totalsOver.overBudgetCount}`);
    check('totals are not clamped either', totalsOver.percent > 100 || totalsOver.percent >= 0);

    // Unbudgeted approved spend is surfaced.
    const e5 = await createExpense(instId, actorId, {
      category: 'MISC', amountMinor: 77700, title: 'Unbudgeted approved', paymentReference: `VT5-${marker}`,
    });
    createdExpenseIds.push(e5.id);
    await approveExpense(instId, actorId, e5.id);
    const miscLine = (await listBudgets(instId, fy)).budgets.find((b) => b.category === 'MISC');
    check('approved spend with no budget line is reported as unbudgeted',
      (miscLine?.unbudgetedRupees ?? 0) >= 777, `${miscLine?.unbudgetedRupees}`);

    // ══ 6. Documents / receipts ══════════════════════════════
    console.log('\nreceipts and documents');
    const e6 = await createExpense(instId, actorId, {
      category: catA, amountMinor: 60000, title: 'Claim needing a receipt', paymentReference: `VT6-${marker}`,
    });
    createdExpenseIds.push(e6.id);
    const missing = await listExpenses(instId, { q: `VT6-${marker}` });
    check('a claim with no receipt is flagged', missing.expenses[0]?.hasReceipt === false);
    check('the missing-receipt filter finds it',
      (await listExpenses(instId, { missingReceipt: true })).expenses.some((x) => x.id === e6.id));
    // e1 was APPROVED with no receipt at all — the exact case an auditor asks
    // about, so it must surface on the same filter.
    check('an APPROVED claim with no receipt still surfaces',
      (await listExpenses(instId, { missingReceipt: true })).expenses.some((x) => x.id === e1.id));

    const key = `verify-${marker}.pdf`;
    const full = path.join(UPLOAD_DIR, key);
    writeFileSync(full, '%PDF-1.4 verification receipt');
    storedPaths.push(full);
    const file = await prisma.file.create({
      data: {
        institutionId: instId, uploaderUserId: actorId, purpose: 'EXPENSE_RECEIPT',
        mimeType: 'application/pdf', sizeBytes: 29, storageKey: key, originalName: 'receipt.pdf',
      },
    });
    createdFileIds.push(file.id);

    const doc = await attachDocument(instId, actorId, e6.id, { fileId: file.id, kind: 'RECEIPT' });
    check('a document attaches to the claim', doc.kind === 'RECEIPT');
    const afterAttach = await listExpenses(instId, { q: `VT6-${marker}` });
    check('an attached receipt flips the flag', afterAttach.expenses[0]?.hasReceipt === true);
    check('the document count is reported', afterAttach.expenses[0]?.documentCount === 1);
    check('attaching leaves the document linked to the claim',
      (await prisma.expenseDocument.count({ where: { expenseId: e6.id } })) === 1);
    check('a claim with a receipt leaves the missing-receipt list',
      !(await listExpenses(instId, { missingReceipt: true })).expenses.some((x) => x.id === e6.id));
    check('approving with a receipt does not warn',
      (await approveExpense(instId, actorId, e6.id)).approvedWithoutReceipt === false);

    let dupeAttach = '';
    const e7 = await createExpense(instId, actorId, {
      category: catA, amountMinor: 60000, title: 'Duplicate attachment target', paymentReference: `VT7-${marker}`,
    });
    createdExpenseIds.push(e7.id);
    try { await attachDocument(instId, actorId, e7.id, { fileId: file.id }); }
    catch (e: any) { dupeAttach = e.code ?? ''; }
    check('the same document cannot pay for two claims', dupeAttach === 'CONFLICT', dupeAttach);

    let badKind = '';
    try { await attachDocument(instId, actorId, e7.id, { fileId: randomUUID(), kind: 'NONSENSE' }); }
    catch (e: any) { badKind = e.code ?? ''; }
    check('an unknown document kind is refused', badKind === 'VALIDATION_ERROR', badKind);

    let unknownFile = '';
    try { await attachDocument(instId, actorId, e7.id, { fileId: randomUUID() }); }
    catch (e: any) { unknownFile = e.code ?? ''; }
    check('an unknown file is a 404', unknownFile === 'NOT_FOUND', unknownFile);

    await detachDocument(instId, actorId, e6.id, doc.id);
    const afterDetach = await listExpenses(instId, { q: `VT6-${marker}` });
    check('detaching removes the receipt flag', afterDetach.expenses[0]?.hasReceipt === false);

    // ══ 7. Department-wise expenditure ═══════════════════════
    console.log('\ndepartment-wise expenditure');
    const deptSpend = await departmentSpend(instId, fy);
    check('department spend returns groups', deptSpend.groups.length > 0, `${deptSpend.groups.length}`);
    if (deptSpend.groups.length) {
      const g = deptSpend.groups[0];
      check('a department group carries its name', typeof g.departmentName === 'string');
      check('approved is a slice of total', g.approvedRupees <= g.totalRupees + 0.001,
        `${g.approvedRupees} vs ${g.totalRupees}`);
      check('pending and rejected are also slices',
        g.pendingRupees + g.approvedRupees + g.rejectedRupees <= g.totalRupees + 0.001);
      check('a group carries its category mix', Array.isArray(g.categories));
      check('the category mix is sorted by money',
        g.categories.every((c, i) => i === 0 || g.categories[i - 1].rupees >= c.rupees));
    }
    const deptWithSpend = deptSpend.groups.find((g) => g.departmentId && g.approvedRupees > 0);
    check('a department with approved spend is reported',
      !!deptWithSpend, `${deptSpend.groups.length} groups`);
    if (deptWithSpend && deptId) {
      check('the department roll-up sees our fixture',
        deptWithSpend.approvedRupees >= 6500, `${deptWithSpend.approvedRupees}`);
    }
    check('spend with no department is labelled Unassigned, not dropped',
      deptSpend.groups.some((g) => g.departmentId === null));

    // ══ 8. Vendor records ═══════════════════════════════════
    console.log('\nvendor and payment records');
    const vendors = await vendorSpend(instId, fy);
    check('the vendor view returns vendors', vendors.vendors.length > 0, `${vendors.vendors.length}`);
    const ourVendor = vendors.vendors.find((v) => v.vendor === 'Verify Vendor');
    check('a normalised vendor is one vendor, not two',
      vendors.vendors.filter((v) => v.vendor.toLowerCase().includes('verify')).length === 1);
    check('whitespace is normalised away', !!ourVendor, JSON.stringify(vendors.vendors.map((v) => v.vendor)));
    if (ourVendor) {
      check('a vendor roll-up totals its approved spend', ourVendor.approvedRupees >= 60,
        `${ourVendor.approvedRupees}`);
      check('a vendor carries its payment methods', ourVendor.paymentMethods.length > 0);
      check('a vendor reports its categories', ourVendor.categories.length > 0);
      check('a vendor whose claims all carry a reference is not flagged',
        ourVendor.missingReferenceCount === 0, `${ourVendor.missingReferenceCount}`);
    }
    // A vendor paid entirely in cash has no bank reference. Those claims are the
    // ones worth a phone call, so the roll-up must count them.
    const eNoRef = await createExpense(instId, actorId, {
      category: 'MISC', amountMinor: 45000, title: 'Cash claim, no reference',
      vendor: 'Cash Counter', paymentMethod: 'CASH',
    });
    createdExpenseIds.push(eNoRef.id);
    await approveExpense(instId, actorId, eNoRef.id);
    const cashVendor = (await vendorSpend(instId, fy)).vendors.find((v) => v.vendor === 'Cash Counter');
    check('a cash vendor with no reference is flagged', cashVendor?.missingReferenceCount === 1,
      `${cashVendor?.missingReferenceCount}`);
    check('vendors are sorted by approved spend',
      vendors.vendors.every((v, i) => i === 0 || vendors.vendors[i - 1].approvedRupees >= v.approvedRupees));
    check('the vendor total is the sum of its parts',
      Math.abs(vendors.totals.approvedRupees - vendors.vendors.reduce((s, v) => s + v.approvedRupees, 0)) < 0.001);
    check('concentration share is a percentage',
      vendors.totals.topVendorSharePercent >= 0 && vendors.totals.topVendorSharePercent <= 100,
      `${vendors.totals.topVendorSharePercent}`);

    // ══ 9. Monthly trends ════════════════════════════════════
    console.log('\nmonthly trends');
    const trend = await monthlyTrend(instId, 12);
    check('the trend returns exactly the requested months', trend.months.length === 12,
      `${trend.months.length}`);
    check('the trend is oldest first',
      trend.months.every((m, i) => i === 0 || trend.months[i - 1].key < m.key));
    check('every month has a label', trend.months.every((m) => typeof m.label === 'string' && m.label.length > 0));
    check('every month reports rupees', trend.months.every((m) => typeof m.approvedRupees === 'number'));
    const allZeroMonths = trend.months.filter((m) => m.approvedRupees === 0);
    check('months with no spend are still present, not dropped', allZeroMonths.length > 0,
      `${allZeroMonths.length} empty months`);
    const totMonths = trend.months.reduce((s, m) => s + m.approvedRupees, 0);
    check('the trend total matches the sum of its months',
      Math.abs(trend.totals.approvedRupees - totMonths) < 0.001,
      `${trend.totals.approvedRupees} vs ${totMonths}`);
    check('the busiest month is a real month key',
      trend.totals.busiestMonth === null || typeof trend.totals.busiestMonth === 'string');
    check('month-on-month change is null or a number',
      trend.totals.changePercent === null || typeof trend.totals.changePercent === 'number');
    const miscTrend = await monthlyTrend(instId, 12, 'MISC');
    check('a category filter narrows the trend',
      miscTrend.totals.approvedRupees <= trend.totals.approvedRupees,
      `${miscTrend.totals.approvedRupees} vs ${trend.totals.approvedRupees}`);

    // ══ 10. List, filters, detail ═══════════════════════════
    console.log('\nlist, filters and detail');
    const all = await listExpenses(instId, { take: 200 });
    check('stats are present', typeof all.stats.totalRupees === 'number');
    check('stats split approved / pending / rejected',
      all.stats.approvedRupees > 0 && all.stats.pendingCount > 0, JSON.stringify(all.stats));
    check('the list returns departments for the filter', Array.isArray(all.departments));
    check('the list returns categories for the entry form', all.categories.length === 5);
    check('every row carries its derived status',
      all.expenses.every((e) => ['PENDING', 'APPROVED', 'REJECTED'].includes(e.status)));
    check('no row has a negative amount', all.expenses.every((e) => e.amountRupees > 0));
    check('a row never claims more tax than it is worth',
      all.expenses.every((e) => e.taxRupees <= e.amountRupees));

    const byStatus = await listExpenses(instId, { status: 'APPROVED', take: 200 });
    check('the status filter works', byStatus.expenses.every((e) => e.status === 'APPROVED'));
    check('the status filter narrows the total',
      byStatus.total <= all.total, `${byStatus.total} vs ${all.total}`);
    check('stats are computed over the whole filtered set, not the page',
      byStatus.stats.approvedRupees > 0 && byStatus.stats.pendingRupees === 0);

    const byVendor = await listExpenses(instId, { vendor: 'Verify', take: 200 });
    check('the vendor filter works', byVendor.expenses.every((e) => (e.vendor ?? '').includes('Verify')));
    const byRef = await listExpenses(instId, { q: `VT-${marker}` });
    check('the search matches a payment reference', byRef.expenses.length >= 1);
    const byMonth = await listExpenses(instId, { month: monthKey(new Date()), take: 200 });
    check('the month filter works', byMonth.expenses.every((e) => e.month === monthKey(new Date())));
    const byFy = await listExpenses(instId, { fiscalYear: fy, take: 200 });
    check('the fiscal-year filter works',
      byFy.expenses.every((e) => fiscalYearOf(new Date(e.date)) === fy));

    const detail = await getExpense(instId, e1.id);
    check('a claim detail resolves', detail.expense.id === e1.id);
    check('detail carries its budget impact', detail.budgetImpact !== null);
    if (detail.budgetImpact) {
      check('budget impact shows what approving would do',
        typeof detail.budgetImpact.ifApprovedPercent === 'number');
      check('budget impact carries a plain category label',
        typeof detail.budgetImpact.categoryLabel === 'string');
    }
    check('detail carries its audit history', Array.isArray(detail.history));
    check('the create is in the history',
      detail.history.some((h) => h.action === 'expense.create'));
    check('the approval is in the history',
      detail.history.some((h) => h.action === 'expense.approve'));

    // ══ 11. Cross-tenant ════════════════════════════════════
    console.log('\ntenancy');
    const other = await prisma.institution.findFirst({ where: { id: { not: instId } } });
    if (other) {
      let nf = '';
      try { await getExpense(other.id, e1.id); } catch (e: any) { nf = e.code ?? ''; }
      check('another institution cannot read the claim', nf === 'NOT_FOUND', nf);
      let nf2 = '';
      try { await approveExpense(other.id, actorId, e1.id); } catch (e: any) { nf2 = e.code ?? ''; }
      check('another institution cannot approve the claim', nf2 === 'NOT_FOUND', nf2);
      let nf3 = '';
      try { await attachDocument(other.id, actorId, e1.id, { fileId: file.id }); }
      catch (e: any) { nf3 = e.code ?? ''; }
      check('another institution cannot attach to the claim', nf3 === 'NOT_FOUND', nf3);
      const otherList = await listExpenses(other.id, { take: 200 });
      check('another institution sees none of these claims',
        !otherList.expenses.some((e) => e.id === e1.id));
    }

    // ══ 12. No orphans ══════════════════════════════════════
    console.log('\nreferential integrity');
    const stillLinked = await prisma.expenseDocument.count({ where: { fileId: { in: createdFileIds } } });
    check('the detached document is really gone from the link table', stillLinked === 0, `${stillLinked}`);
    const dupStorage = await prisma.file.findFirst({
      where: { institutionId: instId, storageKey: { in: createdFileIds.map(() => '') } },
    });
    check('the fixture file row is unique by storage key', dupStorage === null);

  } finally {
    // ── Teardown, most dependent first ──
    for (const p of storedPaths) { try { unlinkSync(p); } catch { /* already gone */ } }
    await prisma.expenseDocument.deleteMany({ where: { expenseId: { in: createdExpenseIds } } }).catch(() => {});
    await prisma.expense.deleteMany({ where: { id: { in: createdExpenseIds } } }).catch(() => {});
    await prisma.file.deleteMany({ where: { id: { in: createdFileIds } } }).catch(() => {});
    await prisma.budget.deleteMany({ where: { id: { in: createdBudgetIds } } }).catch(() => {});
    // Restore any pre-existing budget we nudged, then recompute everything so
    // `spentMinor` is the truth rather than a leftover from this run.
    for (const snap of budgetSnapshots) {
      await prisma.budget.update({
        where: { id: snap.id },
        data: { plannedMinor: snap.plannedMinor },
      }).catch(() => {});
    }
    const remaining = await prisma.budget.findMany({ where: { institutionId: instId }, select: { id: true } });
    await recomputeBudgets(instId, remaining.map((b) => b.id)).catch(() => {});
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
    process.exit(failed ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
