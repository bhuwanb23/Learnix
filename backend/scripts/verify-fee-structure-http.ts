// HTTP contract for F-04 Fee Structure (docs/users/06 §3.5).
//
// This exists because a direct service call cannot see the two failure modes
// that are specific to having a ROUTER:
//
//   1. Route shadowing. `/fee-structures/:id` registered before
//      `/fee-structures/:id/versions` would read the literal segment as an id
//      and 404 a working screen. Invisible in the service layer, fatal on a
//      phone.
//   2. `.strict()` schemas. A misspelled money field is silently DROPPED by a
//      non-strict zod object, so the screen says "saved" while storing a zero.
//
// It also proves the tenancy and auth boundary through the real app, and that
// paise/rupees conversion is not done twice anywhere on the wire.
//
// Usage: npx tsx scripts/verify-fee-structure-http.ts
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import { KIND_IDS } from '../src/modules/accounts/feestructure.money.js';

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
const eq = (label: string, actual: unknown, expected: unknown) =>
  check(label, JSON.stringify(actual) === JSON.stringify(expected), `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);

const app = createApp();
const server = app.listen(0);
const port = (server.address() as { port: number }).port;
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

const TAG = `FSH-${randomUUID().slice(0, 8)}`;
const P = (rupees: number) => rupees * 100;

async function run() {
  const inst = await prisma.institution.create({ data: { name: `FeeStr HTTP ${TAG}`, code: TAG } });
  const instId = inst.id;
  const other = await prisma.institution.findFirst({ where: { id: { not: instId } }, orderBy: { createdAt: 'asc' } });

  const dept = await prisma.department.create({ data: { institutionId: instId, name: 'Engg', code: `E-${TAG}` } });
  const program = await prisma.program.create({
    data: { departmentId: dept.id, name: 'B.Tech', code: `C-${TAG}`, level: 'UG', durationYears: 4, totalSemesters: 8 },
  });
  const program2 = await prisma.program.create({
    data: { departmentId: dept.id, name: 'MBA', code: `M-${TAG}`, level: 'PG', durationYears: 2, totalSemesters: 4 },
  });
  const year = await prisma.academicYear.create({
    data: {
      institutionId: instId, name: '2026-27', startDate: new Date('2026-07-01'),
      endDate: new Date('2027-06-30'), isCurrent: true, semesterCount: 8,
    },
  });
  const user = await prisma.user.create({
    data: { institutionId: instId, fullName: 'Fee HTTP', email: `http-${TAG.toLowerCase()}@test.dev`, passwordHash: 'x' },
  });
  const token = jwt.sign({ sub: user.id, institutionId: instId, roles: ['ACCOUNTS'] }, env.jwtAccessSecret, { expiresIn: '1h' });
  const foreignToken = other
    ? jwt.sign({ sub: 'someone', institutionId: other.id, roles: ['ACCOUNTS'] }, env.jwtAccessSecret, { expiresIn: '1h' })
    : null;

  let structureId = '';
  let draftId = '';
  let concessionId = '';

  try {
    // ── Auth ────────────────────────────────────────────────
    console.log('\n1 · Authentication & tenancy');

    const anon = await api('/api/v1/accounts/fee-structures');
    check('the fee-structure list rejects an unauthenticated request', anon.status === 401, String(anon.status));
    const badToken = await api('/api/v1/accounts/fee-structures', 'not-a-jwt');
    check('a malformed token is rejected', badToken.status === 401, String(badToken.status));

    const empty = await api('/api/v1/accounts/fee-structures', token);
    eq('a fresh institution sees no structures', empty.status, 200);
    eq('and reports zero rather than erroring', empty.json?.data?.total, 0);
    check('the empty list still carries its stats block', empty.json?.data?.stats?.structureCount === 0);

    // ── Create ──────────────────────────────────────────────
    console.log('\n2 · Create a structure');

    const comps = [
      { kind: 'TUITION', label: 'Semester 1 tuition', amountMinor: P(50000), semester: 1 },
      { kind: 'TUITION', label: 'Semester 2 tuition', amountMinor: P(60000), semester: 2 },
      { kind: 'EXAMINATION', label: 'Exam fee', amountMinor: P(6000), semester: 0 },
      { kind: 'HOSTEL', label: 'Hostel', amountMinor: P(45000), semester: 0, optional: true },
    ];
    const created = await api('/api/v1/accounts/fee-structures', token, 'POST', {
      programId: program.id, academicYearId: year.id, components: comps,
      effectiveFrom: '2026-07-01', changeNote: 'HTTP fixture',
    });
    eq('creating a structure returns 201', created.status, 201);
    structureId = created.json?.data?.id;
    check('the created structure has an id', Boolean(structureId));
    eq('the totals are rolled up server-side', created.json?.data?.totalRupees, 161000);
    eq('the tuition headline matches the tuition lines', created.json?.data?.tuitionRupees, 110000);
    check('the response carries components', created.json?.data?.components?.length === 4);

    const dupe = await api('/api/v1/accounts/fee-structures', token, 'POST', {
      programId: program.id, academicYearId: year.id, components: comps,
    });
    eq('a duplicate program+year is refused with 409', dupe.status, 409);

    // Strict schemas — the bug class that stores a silent zero.
    console.log('\n3 · Strict write schemas (a silent zero is worse than an error)');

    const misspelled = await api('/api/v1/accounts/fee-structures', token, 'POST', {
      programId: program2.id,
      academicYearId: year.id,
      components: [{ kind: 'TUITION', label: 'Tuition', amount: P(90000), semester: 1 }], // `amount`, not `amountMinor`
    });
    eq('a misspelled money field is rejected, not dropped', misspelled.status, 400);
    eq('and nothing was written for it',
      await prisma.feeStructure.count({ where: { programId: program2.id } }), 0);

    const noComponents = await api('/api/v1/accounts/fee-structures', token, 'POST', {
      programId: program2.id, academicYearId: year.id, components: [],
    });
    eq('a structure with no charge lines is rejected', noComponents.status, 400);

    const badKind = await api('/api/v1/accounts/fee-structures', token, 'POST', {
      programId: program2.id,
      academicYearId: year.id,
      components: [{ kind: 'CRYPTO', label: 'Crypto fee', amountMinor: P(1000) }],
    });
    eq('an unrecognised charge type is rejected at the edge', badKind.status, 400);
    check('the error names the offending field path',
      JSON.stringify(badKind.json?.error?.details?.fieldErrors ?? {}).includes('CRYPTO'),
      JSON.stringify(badKind.json?.error?.details));

    const badDate = await api('/api/v1/accounts/fee-structures', token, 'POST', {
      programId: program2.id, academicYearId: year.id, components: comps, effectiveFrom: '01-07-2026',
    });
    eq('a malformed effective date is rejected', badDate.status, 400);

    const unknownQuery = await api('/api/v1/accounts/fee-structures?bogus=1', token);
    eq('an unknown query parameter is rejected rather than ignored', unknownQuery.status, 400);

    const unknownSort = await api('/api/v1/accounts/fee-structures?sort=RANDOM', token);
    eq('an unknown sort key is rejected', unknownSort.status, 400);

    // ── Route ordering: the bug a service call cannot see ───
    console.log('\n4 · Route ordering (literal paths must beat /:id)');

    const versions = await api(`/api/v1/accounts/fee-structures/${structureId}/versions`, token);
    eq('GET .../versions is not shadowed by /:id', versions.status, 200);
    check('it returns the version list, not a structure', Array.isArray(versions.json?.data?.items));
    eq('with the right total', versions.json?.data?.total, 1);

    const concessions = await api(`/api/v1/accounts/fee-structures/${structureId}/concessions`, token);
    eq('GET .../concessions is not shadowed', concessions.status, 200);
    check('it returns the concession list', Array.isArray(concessions.json?.data?.items));

    const resolve = await api(`/api/v1/accounts/fee-structures/${structureId}/resolve`, token);
    eq('GET .../resolve is not shadowed', resolve.status, 200);
    check('it answers the effective-date question', resolve.json?.data?.resolved === true);

    const installments = await api(`/api/v1/accounts/fee-structures/${structureId}/installments`, token, 'PUT', {
      count: 3, frequency: 'MONTHLY', firstDueDays: 45,
    });
    eq('PUT .../installments is not shadowed', installments.status, 200);
    eq('and the three bills add back to the whole fee', installments.json?.data?.scheduleTotalRupees, installments.json?.data?.totalRupees);

    const one = await api(`/api/v1/accounts/fee-structures/${structureId}`, token);
    eq('GET /:id still resolves to the structure itself', one.status, 200);
    eq('and is not the version list', Array.isArray(one.json?.data?.components), true);

    // ── Effective dates ─────────────────────────────────────
    console.log('\n5 · Effective-date resolution over HTTP');

    const onDate = await api(`/api/v1/accounts/fee-structures/${structureId}/resolve?onDate=2026-07-15`, token);
    eq('a valid date is accepted', onDate.status, 200);
    eq('and resolves to version 1', onDate.json?.data?.version?.versionNo, 1);
    eq('and echoes the LOCAL day back, not a UTC-shifted one', onDate.json?.data?.onDay, '2026-07-15');

    const outside = await api(`/api/v1/accounts/fee-structures/${structureId}/resolve?onDate=2026-01-01`, token);
    eq('a date outside every window still answers 200', outside.status, 200);
    eq('but says it cannot be billed', outside.json?.data?.resolved, false);

    const badOnDate = await api(`/api/v1/accounts/fee-structures/${structureId}/resolve?onDate=nonsense`, token);
    eq('a malformed date is rejected', badOnDate.status, 400);

    const semester = await api(`/api/v1/accounts/fee-structures/${structureId}/resolve?semester=3`, token);
    eq('a semester can be priced over HTTP', semester.status, 200);
    check('and returns a semester amount', typeof semester.json?.data?.semesterAmountRupees === 'number');

    // ── Versions over HTTP ──────────────────────────────────
    console.log('\n6 · Draft, publish, discard');

    const draft = await api(`/api/v1/accounts/fee-structures/${structureId}/versions`, token, 'POST', {
      effectiveFrom: '2026-10-01', changeNote: '8% increase',
    });
    eq('creating a draft returns 201', draft.status, 201);
    draftId = draft.json?.data?.id;
    eq('it starts as a DRAFT', draft.json?.data?.status, 'DRAFT');
    eq('as version 2', draft.json?.data?.versionNo, 2);

    const second = await api(`/api/v1/accounts/fee-structures/${structureId}/versions`, token, 'POST', {});
    eq('a second concurrent draft is refused', second.status, 409);

    const badPublish = await api(`/api/v1/accounts/fee-structures/${structureId}/versions/${draftId}/publish`, token, 'POST', {
      effectiveFrom: '01-10-2026',
    });
    eq('a malformed publish date is rejected', badPublish.status, 400);

    const published = await api(`/api/v1/accounts/fee-structures/${structureId}/versions/${draftId}/publish`, token, 'POST', {
      effectiveFrom: '2026-10-01', changeNote: '8% increase',
    });
    eq('publishing returns 200', published.status, 200);
    eq('the new version is in force', published.json?.data?.versions?.find((v: any) => v.isCurrent)?.versionNo, 2);
    eq('the old one is marked replaced', published.json?.data?.versions?.find((v: any) => v.versionNo === 1)?.status, 'SUPERSEDED');

    const republish = await api(`/api/v1/accounts/fee-structures/${structureId}/versions/${draftId}/publish`, token, 'POST', {});
    eq('republishing an already-published version is refused', republish.status, 409);

    const july = await api(`/api/v1/accounts/fee-structures/${structureId}/resolve?onDate=2026-07-15`, token);
    eq('after the revision, a JULY bill still prices at version 1', july.json?.data?.version?.versionNo, 1);
    const october = await api(`/api/v1/accounts/fee-structures/${structureId}/resolve?onDate=2026-10-01`, token);
    eq('and an OCTOBER bill prices at version 2', october.json?.data?.version?.versionNo, 2);
    const detailJuly = await api(`/api/v1/accounts/fee-structures/${structureId}?onDate=2026-07-15`, token);
    eq('the detail screen can be pointed at the same date', detailJuly.json?.data?.resolvedVersion?.versionNo, 1);

    const d3 = await api(`/api/v1/accounts/fee-structures/${structureId}/versions`, token, 'POST', { effectiveFrom: '2027-04-01' });
    const discarded = await api(`/api/v1/accounts/fee-structures/${structureId}/versions/${d3.json?.data?.id}/discard`, token, 'POST', {});
    eq('a draft can be discarded', discarded.status, 200);
    eq('and is marked rather than deleted', discarded.json?.data?.status, 'DRAFT_DISCARDED');

    const badVersionId = await api(`/api/v1/accounts/fee-structures/${structureId}/versions/nope/publish`, token, 'POST', {});
    check('an unknown version id is a 404, not a 500', badVersionId.status === 404 || badVersionId.status === 400, String(badVersionId.status));

    // ── Components over HTTP ────────────────────────────────
    console.log('\n7 · Editing charge lines');

    const replace = await api(`/api/v1/accounts/fee-structures/${structureId}/components`, token, 'PUT', {
      components: [
        ...comps.slice(0, 2),
        { kind: 'OTHER', label: 'Sports fee', amountMinor: P(3000), semester: 0 },
      ],
      changeNote: 'Added sports',
    });
    eq('replacing components returns 200', replace.status, 200);
    eq('and reports what moved', replace.json?.data?.deltaRupees, 113000 - 161000);
    const after = await api(`/api/v1/accounts/fee-structures/${structureId}`, token);
    eq('the total moved with them', after.json?.data?.totalRupees, 113000);
    eq('and the semester schedule still foots to it',
      after.json?.data?.semesterSchedule?.reduce((s: number, x: any) => s + x.amountRupees, 0), 113000);

    const badReplace = await api(`/api/v1/accounts/fee-structures/${structureId}/components`, token, 'PUT', {
      components: [{ kind: 'HOSTEL', label: 'Hostel', amountMinor: 0 }],
    });
    check('an invalid component list is refused', badReplace.status === 422 || badReplace.status === 400, String(badReplace.status));

    const stale = await api(`/api/v1/accounts/fee-structures/${structureId}/components`, token, 'PUT', {
      expectedVersionId: 'stale-id',
      components: [{ kind: 'TUITION', label: 'X', amountMinor: P(1) }],
    });
    eq('an edit against a stale version is refused', stale.status, 409);

    // ── Concessions over HTTP ───────────────────────────────
    console.log('\n8 · Concessions over HTTP');

    const rule = await api(`/api/v1/accounts/fee-structures/${structureId}/concessions`, token, 'POST', {
      name: 'Merit scholarship', kind: 'MERIT', basis: 'PERCENT', valueBp: 5000, appliesTo: 'TUITION',
    });
    eq('creating a concession returns 201', rule.status, 201);
    concessionId = rule.json?.data?.id;
    eq('and reports what it gives back', rule.json?.data?.waiverRupees, 55000);

    const preview = await api(`/api/v1/accounts/fee-structures/${structureId}/concessions/preview`, token, 'POST', {});
    eq('the preview is not shadowed by /:concessionId', preview.status, 200);
    eq('and starts from the full bill', preview.json?.data?.billRupees, 113000);
    eq('less the waiver', preview.json?.data?.netRupees, 113000 - 55000);

    const previewOne = await api(`/api/v1/accounts/fee-structures/${structureId}/concessions/preview`, token, 'POST', {
      concessionIds: [concessionId],
    });
    eq('previewing a chosen subset works', previewOne.json?.data?.waiverRupees, 55000);

    const edited = await api(`/api/v1/accounts/fee-structures/${structureId}/concessions/${concessionId}`, token, 'PUT', {
      name: 'Merit scholarship', basis: 'PERCENT', valueBp: 10000, appliesTo: 'TUITION',
    });
    eq('editing a concession returns 200', edited.status, 200);
    eq('and the new rate takes effect', edited.json?.data?.waiverRupees, 110000);

    const overCap = await api(`/api/v1/accounts/fee-structures/${structureId}/concessions`, token, 'POST', {
      name: 'Absurd', basis: 'FLAT', amountMinor: P(900000), appliesTo: 'TUITION',
    });
    eq('a concession larger than the charges is refused with 422', overCap.status, 422);
    eq('and nothing was written',
      await prisma.feeConcession.count({ where: { feeStructureId: structureId, name: 'Absurd' } }), 0);

    const badBp = await api(`/api/v1/accounts/fee-structures/${structureId}/concessions`, token, 'POST', {
      name: 'Too big', basis: 'PERCENT', valueBp: 99999, appliesTo: 'TUITION',
    });
    eq('a percentage over 100% is rejected at the edge', badBp.status, 400);

    const removed = await api(`/api/v1/accounts/fee-structures/${structureId}/concessions/${concessionId}`, token, 'DELETE');
    eq('deleting a concession returns 200', removed.status, 200);
    eq('and it is really gone', await prisma.feeConcession.count({ where: { id: concessionId } }), 0);

    const missingVersion = await api(`/api/v1/accounts/fee-structures/${structureId}/versions`, token, 'POST', {});
    eq('a draft can be opened again after the earlier one was discarded', missingVersion.status, 201);
    await api(`/api/v1/accounts/fee-structures/${structureId}/versions/${missingVersion.json?.data?.id}/discard`, token, 'POST', {});

    // ── Instalment validation ───────────────────────────────
    console.log('\n9 · Instalment validation over HTTP');

    const tooMany = await api(`/api/v1/accounts/fee-structures/${structureId}/installments`, token, 'PUT', {
      count: 30, frequency: 'MONTHLY',
    });
    check('more than 12 instalments is refused', tooMany.status === 400 || tooMany.status === 422, String(tooMany.status));

    const zero = await api(`/api/v1/accounts/fee-structures/${structureId}/installments`, token, 'PUT', {
      count: 0, frequency: 'MONTHLY',
    });
    check('zero instalments is refused', zero.status === 400 || zero.status === 422, String(zero.status));

    const badFreq = await api(`/api/v1/accounts/fee-structures/${structureId}/installments`, token, 'PUT', {
      count: 3, frequency: 'FORTNIGHTLY-ish',
    });
    check('an unknown frequency is refused', badFreq.status === 400 || badFreq.status === 422, String(badFreq.status));

    const good = await api(`/api/v1/accounts/fee-structures/${structureId}/installments`, token, 'PUT', {
      count: 4, frequency: 'QUARTERLY', firstDueDays: 30,
    });
    eq('a valid plan is accepted', good.status, 200);
    eq('four quarterly bills add back to the whole fee', good.json?.data?.scheduleTotalRupees, good.json?.data?.totalRupees);
    check('each bill carries a local due day', good.json?.data?.schedule?.every((s: any) => typeof s.dueDay === 'string'));

    // ── Legacy alias ────────────────────────────────────────
    console.log('\n10 · Legacy alias');

    const legacy = await api('/api/v1/accounts/fee-structure', token);
    eq('the legacy singular list still answers', legacy.status, 200);
    check('with the flat shape the old screen expects',
      legacy.json?.data?.[0] && legacy.json.data[0].program && typeof legacy.json.data[0].totalRupees === 'number');
    const rev = await api(`/api/v1/accounts/fee-structure/${structureId}/revision`, token, 'POST');
    eq('the legacy revision request still works', rev.status, 200);
    eq('and sets the old status', rev.json?.data?.status, 'REVISION_REQUESTED');
    const revAgain = await api(`/api/v1/accounts/fee-structure/${structureId}/revision`, token, 'POST');
    eq('requesting twice is refused', revAgain.status, 409);
    await prisma.feeStructure.update({ where: { id: structureId }, data: { status: 'ACTIVE', requestedByUserId: null } });

    // ── Tenancy ─────────────────────────────────────────────
    console.log('\n11 · The tenancy boundary');

    const foreignRead = await api(`/api/v1/accounts/fee-structures/${structureId}`, foreignToken ?? undefined);
    check('another institution cannot read our structure', foreignRead.status === 404 || foreignRead.status === 401, String(foreignRead.status));
    const foreignList = await api('/api/v1/accounts/fee-structures', foreignToken ?? undefined);
    check('another institution does not see our structure in its list',
      foreignList.status !== 200
        || !(foreignList.json?.data?.items ?? []).some((s: any) => s.id === structureId));
    const foreignEdit = await api(`/api/v1/accounts/fee-structures/${structureId}/components`, foreignToken ?? undefined, 'PUT', {
      components: [{ kind: 'TUITION', label: 'Hijack', amountMinor: P(1) }],
    });
    check('another institution cannot edit our components', foreignEdit.status === 404 || foreignEdit.status === 401, String(foreignEdit.status));
    const foreignConcession = await api(`/api/v1/accounts/fee-structures/${structureId}/concessions`, foreignToken ?? undefined, 'POST', {
      name: 'Leak', basis: 'PERCENT', valueBp: 100,
    });
    check('another institution cannot add a concession to it', foreignConcession.status === 404 || foreignConcession.status === 401);
    const foreignPublish = await api(`/api/v1/accounts/fee-structures/${structureId}/versions/${draftId}/publish`, foreignToken ?? undefined, 'POST', {});
    check('another institution cannot publish our version', foreignPublish.status === 404 || foreignPublish.status === 401);
    const foreignDraft = await api(`/api/v1/accounts/fee-structures/${structureId}/versions`, foreignToken ?? undefined, 'POST', {});
    check('another institution cannot open a draft on it', foreignDraft.status === 404 || foreignDraft.status === 401);

    // ── Filters ─────────────────────────────────────────────
    console.log('\n12 · Filters and stats');

    const byProgram = await api(`/api/v1/accounts/fee-structures?programId=${program.id}`, token);
    eq('filtering by program finds it', byProgram.json?.data?.total, 1);
    const byOther = await api(`/api/v1/accounts/fee-structures?programId=${program2.id}`, token);
    eq('filtering by another program finds nothing', byOther.json?.data?.total, 0);
    eq('and reports zero stats rather than crashing', byOther.json?.data?.stats?.annualTotalRupees, 0);
    const byYear = await api(`/api/v1/accounts/fee-structures?academicYearId=${year.id}`, token);
    eq('filtering by academic year finds it', byYear.json?.data?.total, 1);
    const byStatus = await api('/api/v1/accounts/fee-structures?status=REVISION_REQUESTED', token);
    eq('filtering by status excludes an active structure', byStatus.json?.data?.total, 0);
    const byStatus2 = await api('/api/v1/accounts/fee-structures?status=ACTIVE', token);
    eq('and the active filter includes it', byStatus2.json?.data?.total, 1);
    const sorted = await api('/api/v1/accounts/fee-structures?sort=TOTAL_DESC', token);
    eq('sorting by total works', sorted.status, 200);
    check('the filter options come back for the picker', Array.isArray(sorted.json?.data?.filters?.programs));
    const search = await api('/api/v1/accounts/fee-structures?q=B.Tech', token);
    eq('search finds the program', search.json?.data?.total, 1);

    // ── Money on the wire ───────────────────────────────────
    console.log('\n13 · Money arrives in whole rupees, never paise');

    const detail = (await api(`/api/v1/accounts/fee-structures/${structureId}`, token)).json?.data;
    check('no money field is fractional', [detail.totalRupees, detail.tuitionRupees, detail.otherRupees]
      .every((v: unknown) => Number.isInteger(v)));
    check('the components carry whole rupees too',
      detail.components.every((c: any) => Number.isInteger(c.amountRupees) && Number.isInteger(c.netRupees)));
    check('the semester schedule carries whole rupees',
      detail.semesterSchedule.every((s: any) => Number.isInteger(s.amountRupees)));
    check('the instalment schedule carries whole rupees',
      detail.installments.schedule.every((s: any) => Number.isInteger(s.amountRupees)));
    check('the schedule still adds back to the total',
      detail.installments.schedule.reduce((s: number, x: any) => s + x.amountRupees, 0) === detail.totalRupees);
    check('the semester schedule still adds back to the total',
      detail.semesterSchedule.reduce((s: number, x: any) => s + x.amountRupees, 0) === detail.totalRupees);

    // Every charge type the client offers must be one the server accepts, or
    // the picker produces a filter that returns nothing.
    console.log('\n14 · Client/server constant agreement');
    check('the server declares the charge types the fee editor offers',
      ['TUITION', 'EXAMINATION', 'HOSTEL', 'LIBRARY', 'ADMISSION', 'TRANSPORT', 'OTHER'].every((k) => KIND_IDS.includes(k)));
    check('every seeded/created kind is in that list',
      detail.components.every((c: any) => KIND_IDS.includes(c.kind)));

    const notFound = await api('/api/v1/accounts/fee-structures/does-not-exist', token);
    eq('an unknown structure is a 404', notFound.status, 404);
  } finally {
    // ── Teardown, most dependent first ──
    await prisma.auditLog.deleteMany({ where: { institutionId: instId } });
    await prisma.lateFeeRule.deleteMany({ where: { institutionId: instId } });
    await prisma.feeConcession.deleteMany({ where: { institutionId: instId } });
    await prisma.feeStructureVersion.deleteMany({ where: { institutionId: instId } });
    await prisma.feeComponent.deleteMany({ where: { institutionId: instId } });
    await prisma.feeStructure.deleteMany({ where: { institutionId: instId } });
    await prisma.academicYear.deleteMany({ where: { institutionId: instId } });
    await prisma.program.deleteMany({ where: { departmentId: dept.id } });
    await prisma.department.deleteMany({ where: { institutionId: instId } });
    await prisma.user.deleteMany({ where: { institutionId: instId } });
    await prisma.institution.deleteMany({ where: { id: instId } });
    await prisma.$disconnect();
    server.close();
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