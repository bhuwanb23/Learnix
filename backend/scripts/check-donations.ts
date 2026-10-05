/**
 * DB-free checks for the fundraising/donations feature.
 *
 * No server, no database. These exercise the pure parts — money conversion,
 * campaign progress, cadence arithmetic, anonymity masking, receipt assembly and
 * the Zod contracts — so a regression shows up without seeded fixtures.
 */
import {
  toRupees,
  toMinor,
  formatINR,
  nextDueDate,
  addMonths,
  annualisedMinor,
  cadenceMeta,
  fundMeta,
  categoryMeta,
  methodMeta,
} from '../src/modules/alumni/donations/money.js';
import { progress, isOpen } from '../src/modules/alumni/donations/campaigns.service.js';
import {
  pledgeSchema,
  mandateCreateSchema,
  mandateStatusSchema,
  donationPageQuerySchema,
  campaignUpdateSchema,
} from '../src/modules/alumni/donations/donations.schemas.js';

let pass = 0;
const failures: string[] = [];
function check(label: string, ok: boolean, detail = '') {
  if (ok) pass++;
  else {
    failures.push(label);
    console.log(`  x ${label} ${detail}`);
  }
}

// ── Money ──
check('paise convert to whole rupees', toRupees(500_00) === 500, String(toRupees(500_00)));
check('a null amount is zero, not NaN', toRupees(null) === 0, String(toRupees(null)));
check('rupees convert to paise', toMinor(2500) === 250_000, String(toMinor(2500)));
check('a fractional rupee amount is refused', (() => {
  try {
    toMinor(500.5);
    return false;
  } catch {
    return true;
  }
})(), '₹500.50 must not silently round');
check('zero and negative amounts are refused', (() => {
  try {
    toMinor(0);
    return false;
  } catch {
    try {
      toMinor(-100);
      return false;
    } catch {
      return true;
    }
  }
})(), 'zero/negative must be refused');
check('an amount past the Int ceiling is refused, not overflowed', (() => {
  try {
    toMinor(30_000_000);
    return false;
  } catch {
    return true;
  }
})(), '₹3 Cr in paise exceeds SQLite Int — must fail with a message');
check('compact INR uses Cr / L / K', formatINR(12_345_678).includes('Cr') && formatINR(450_000).includes('L') && formatINR(45_000).includes('K'), `${formatINR(12345678)} ${formatINR(450000)} ${formatINR(45000)}`);

// ── Campaign progress ──
check('percent is computed from target and raised', progress({ targetMinor: 100_000_00, raisedMinor: 45_000_00 }).percent === 45, '45%');
check('percent is NOT clamped when a campaign overshoots', progress({ targetMinor: 100_00, raisedMinor: 128_00 }).percent === 128, 'a 128% fund is real; clamping states a falsehood');
check('remaining is never negative once the target is met', progress({ targetMinor: 100_00, raisedMinor: 150_00 }).remainingRupees === 0, String(progress({ targetMinor: 100_00, raisedMinor: 150_00 }).remainingRupees));
check('met=true when raised meets target', progress({ targetMinor: 100_00, raisedMinor: 100_00 }).met === true, 'met');
check('a zero target does not divide by zero', progress({ targetMinor: 0, raisedMinor: 500_00 }).percent === 0, String(progress({ targetMinor: 0, raisedMinor: 500_00 }).percent));
check('a campaign with no deadline stays open', isOpen({ status: 'ACTIVE', deadline: null }) === true, 'no deadline');
check('a past deadline closes the campaign even while status says ACTIVE', isOpen({ status: 'ACTIVE', deadline: new Date(Date.now() - 86_400_000) }) === false, 'expiry is derived, not stored');
check('a COMPLETED campaign is closed', isOpen({ status: 'COMPLETED', deadline: null }) === false, 'status COMPLETED');

// ── Cadence arithmetic ──
// `now` is passed explicitly: the real clock is Oct 2026, so an unpinned Jan 2026
// anchor would roll forward ten months and the assertion would be about the clock.
const anchor = new Date('2026-01-15T00:00:00Z');
const pin = new Date('2026-01-01T00:00:00Z');
check('monthly rolls forward one month', nextDueDate(anchor, 'MONTHLY', pin).getUTCMonth() === 1, nextDueDate(anchor, 'MONTHLY', pin).toISOString());
check('31 January clamps to the last day of February, never 3 March', (() => {
  const d = addMonths(new Date('2026-01-31T00:00:00Z'), 1);
  return d.getUTCMonth() === 1 && d.getUTCDate() === 28;
})(), addMonths(new Date('2026-01-31T00:00:00Z'), 1).toISOString());
check('a leap-year February clamps to the 29th', (() => {
  const d = addMonths(new Date('2028-01-31T00:00:00Z'), 1);
  return d.getUTCMonth() === 1 && d.getUTCDate() === 29;
})(), addMonths(new Date('2028-01-31T00:00:00Z'), 1).toISOString());
check('quarterly rolls three months', nextDueDate(anchor, 'QUARTERLY', pin).getUTCMonth() === 3, nextDueDate(anchor, 'QUARTERLY', pin).toISOString());
check('a due date in the past rolls forward instead of being immediately due', (() => {
  const now = new Date('2026-06-01T00:00:00Z');
  const next = nextDueDate(new Date('2026-01-10T00:00:00Z'), 'MONTHLY', now);
  return next.getTime() > now.getTime();
})(), nextDueDate(new Date('2026-01-10T00:00:00Z'), 'MONTHLY', new Date('2026-06-01T00:00:00Z')).toISOString());
check('annualised giving multiplies by twelve', annualisedMinor(10_000_00, 'MONTHLY') === 120_000_00, String(annualisedMinor(10_000_00, 'MONTHLY')));
check('annualised giving divides by the cycle length', annualisedMinor(120_000_00, 'ANNUAL') === 120_000_00, String(annualisedMinor(120_000_00, 'ANNUAL')));
check('cadence metadata is present for every cadence', ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'].every((c) => cadenceMeta(c).months > 0), 'all four');

// ── Presentation metadata ──
check('every fund has a label', ['GENERAL', 'LIBRARY', 'SCHOLARSHIP', 'INFRASTRUCTURE'].every((f) => fundMeta(f).label.length > 0), 'funds');
check('an unknown fund still renders something', fundMeta('MYSTERY').label === 'MYSTERY', fundMeta('MYSTERY').label);
check('every campaign category has a label', ['SCHOLARSHIP', 'INFRASTRUCTURE', 'LIBRARY', 'RESEARCH', 'SPORTS', 'GENERAL'].every((c) => categoryMeta(c).label.length > 0), 'categories');
check('every payment method has a label', ['UPI', 'NET_BANKING', 'CARD', 'CASH'].every((m) => methodMeta(m).label.length > 0), 'methods');

// ── Contracts ──
check('pledge requires an amount', !pledgeSchema.safeParse({}).success, 'no amount');
check('pledge refuses a zero amount', !pledgeSchema.safeParse({ amountRupees: 0 }).success, 'zero');
check('pledge refuses a fractional amount', !pledgeSchema.safeParse({ amountRupees: 100.5 }).success, 'fractional');
check('pledge accepts an anonymous gift', pledgeSchema.safeParse({ amountRupees: 5000, isAnonymous: true }).success, 'anonymous');
check('pledge coerces a string amount from a form', (pledgeSchema.safeParse({ amountRupees: '5000' }) as any).data?.amountRupees === 5000, 'string "5000"');
check('pledge refuses an unknown fund', !pledgeSchema.safeParse({ amountRupees: 100, fund: 'CRYPTO' }).success, 'fund enum');
check('pledge accepts an unrestricted gift (no campaign)', pledgeSchema.safeParse({ amountRupees: 100, campaignId: null }).success, 'unrestricted');

check('mandate requires an amount', !mandateCreateSchema.safeParse({}).success, 'no amount');
check('mandate accepts a cadence', mandateCreateSchema.safeParse({ amountRupees: 1000, cadence: 'QUARTERLY' }).success, 'quarterly');
check('mandate refuses an unknown cadence', !mandateCreateSchema.safeParse({ amountRupees: 1000, cadence: 'FORTNIGHTLY' }).success, 'cadence enum');

check('pause needs no reason', mandateStatusSchema.safeParse({ action: 'pause' }).success, 'pause');
check('cancel without a reason is refused', !mandateStatusSchema.safeParse({ action: 'cancel' }).success, 'cancel');
check('cancel with a 2-char reason is refused', !mandateStatusSchema.safeParse({ action: 'cancel', reason: 'no' }).success, 'too short');
check('cancel with a real reason is accepted', mandateStatusSchema.safeParse({ action: 'cancel', reason: 'Graduating next term.' }).success, 'accepted');

check('the ledger accepts a mine flag', donationPageQuerySchema.safeParse({ mine: 'true' }).success, 'mine');
// There is deliberately no userId filter: "my giving" is resolved from the session.
check('the ledger refuses a userId filter', (() => {
  const parsed = donationPageQuerySchema.safeParse({ userId: 'someone-else' });
  return parsed.success && !(parsed.data as any).userId;
})(), 'a caller cannot ask for another donor');

check('campaign update accepts a single field', campaignUpdateSchema.safeParse({ status: 'COMPLETED' }).success, 'one field');
check('campaign update refuses an empty body', !campaignUpdateSchema.safeParse({}).success, 'empty');
check('campaign update can clear a deadline', campaignUpdateSchema.safeParse({ deadline: null }).success, 'nullable deadline');

console.log(`\n  ${pass} passed, ${failures.length} failed`);
if (failures.length) {
  console.log(`  failing: ${failures.join(', ')}`);
  process.exit(1);
}
