// UI contract audit for F-04 Fee Structure (docs/users/06 §3.5).
//
// A screen that reads a field the API never sends does not crash — it renders
// `undefined`, which on a money screen means "₹undefined" or a total that reads
// zero. That class of bug survives a successful build, a passing backend suite
// and a Metro bundle. So this script walks the responses the fee-structure
// endpoints actually return and asserts every field the screens read is really
// there.
//
// Four directions, and all four matter:
//   1. SCREEN -> API. Every field each of the seven screens reads.
//   2. API -> ROUTES. Every `navigate('X')` must have a FEATURE_MODULES entry,
//      or the button silently does nothing.
//   3. IMPORT PATHS. The sub-pages are six levels deep; a wrong relative path to
//      `services/api` or to the sibling meta module is a runtime crash that no
//      static check in this repo would catch.
//   4. CONSTANTS. The charge types and statuses the client offers must be the
//      ones the server accepts, or the picker produces a filter that returns
//      nothing.
//
// Usage: npx tsx scripts/audit-fee-structure-ui.ts
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import {
  KIND_IDS, CONCESSION_KINDS, INSTALLMENT_FREQUENCIES,
  VERSION_STATUS_META, CONCESSION_SCOPES,
} from '../src/modules/accounts/feestructure.money.js';

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
const FS_DIR = path.join(UI, 'pages', 'fee_structure');

const app = createApp();
const server = app.listen(0);
const port = (server.address() as { port: number }).port;
const BASE = `http://127.0.0.1:${port}`;

async function api(p: string, token: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
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

  try {
    // ── Live responses ────────────────────────────────────────
    console.log('\nlive fee-structure endpoints respond');
    const list = await api('/api/v1/accounts/fee-structures', token);
    check('GET /fee-structures is 200', list.status === 200, `${list.status}`);
    const first = list.json?.data?.items?.[0];
    check('the seed has at least one priced structure', !!first);
    const id = first?.id;

    const detail = await api(`/api/v1/accounts/fee-structures/${id}`, token);
    check('GET /fee-structures/:id is 200', detail.status === 200, `${detail.status}`);
    const d = detail.json.data;

    const versions = await api(`/api/v1/accounts/fee-structures/${id}/versions`, token);
    check('GET .../versions is 200', versions.status === 200, `${versions.status}`);
    const concessions = await api(`/api/v1/accounts/fee-structures/${id}/concessions`, token);
    check('GET .../concessions is 200', concessions.status === 200, `${concessions.status}`);
    const resolve = await api(`/api/v1/accounts/fee-structures/${id}/resolve`, token);
    check('GET .../resolve is 200', resolve.status === 200, `${resolve.status}`);

    // ── 1. Hub row fields ─────────────────────────────────────
    console.log('\nhub row fields');
    // Field names read off the hub screen, not invented.
    const rowFields = [
      'id', 'program', 'programCode', 'programLevel', 'totalSemesters', 'academicYear',
      'academicYearId', 'isCurrentYear', 'yearStart', 'yearStartDay', 'status',
      'effectiveFromDay', 'effectiveToDay', 'tuitionRupees', 'otherRupees', 'totalRupees',
      'mandatoryRupees', 'optionalRupees', 'componentCount', 'semesterCount',
      'versionCount', 'publishedVersionNo', 'hasDraft', 'concessionCount',
      'concessionWaiverRupees', 'netAfterConcessionRupees', 'installmentCount',
      'installmentFrequency', 'installmentSummary', 'penalty', 'projectedAnnualCollectionRupees',
    ];
    for (const f of rowFields) {
      check(`a hub row carries "${f}"`, f in first, `keys: ${Object.keys(first).join(',')}`);
    }
    const statFields = [
      'structureCount', 'programCount', 'yearCount', 'annualTotalRupees', 'tuitionRupees',
      'otherRupees', 'averageRupees', 'draftCount', 'concessionCount', 'currentYearName',
    ];
    for (const f of statFields) {
      check(`hub stats carry "${f}"`, f in list.json.data.stats,
        `keys: ${Object.keys(list.json.data.stats).join(',')}`);
    }
    check('the list sends program options with an id for the filter',
      Array.isArray(list.json.data.filters.programs) && !!list.json.data.filters.programs[0]?.id);
    check('the list sends year options', Array.isArray(list.json.data.filters.years));

    // The hub's concession-aware headline must actually be less than the bill.
    check('the net-after-concessions figure is never more than the fee',
      first.netAfterConcessionRupees <= first.totalRupees,
      `${first.netAfterConcessionRupees} vs ${first.totalRupees}`);

    // ── 2. Detail screen ──────────────────────────────────────
    console.log('\ndetail screen fields');
    const detailFields = [
      'id', 'program', 'academicYear', 'status', 'effectiveFromDay', 'effectiveToDay',
      'resolvedOn', 'resolvedOnDay', 'resolvedVersion', 'outOfWindow', 'totalSemesters',
      'tuitionRupees', 'otherRupees', 'totalRupees', 'mandatoryRupees', 'optionalRupees',
      'semesterSchedule', 'tuitionBySemester', 'components', 'concessions',
      'concessionSummary', 'installments', 'penalty', 'versions', 'versionCount',
      'draftCount', 'history', 'updatedAt',
    ];
    for (const f of detailFields) {
      check(`the detail carries "${f}"`, f in d, `keys: ${Object.keys(d).join(',')}`);
    }
    for (const f of ['id', 'name', 'code', 'level']) {
      check(`the detail program carries "${f}"`, f in d.program);
    }
    check('the semester count sits at the top level, where the editor reads it',
      typeof d.totalSemesters === 'number' && d.totalSemesters > 0, String(d.totalSemesters));
    for (const f of ['id', 'name', 'startDate', 'startDay', 'endDate', 'endDay', 'isCurrent']) {
      check(`the detail academic year carries "${f}"`, f in d.academicYear);
    }

    // The semester schedule is the invariant the whole proration rests on.
    const semSum = d.semesterSchedule.reduce((s: number, x: any) => s + x.amountRupees, 0);
    check('the semester schedule adds back up to the annual total', semSum === d.totalRupees,
      `${semSum} vs ${d.totalRupees}`);
    check('every semester cell carries a local label and a whole-rupee amount',
      d.semesterSchedule.every((x: any) => typeof x.label === 'string' && Number.isInteger(x.amountRupees)));
    check('the tuition-per-semester grid is one entry per semester',
      d.tuitionBySemester.length === d.totalSemesters);

    console.log('\ncharge-line fields');
    const comp = d.components[0];
    check('the seed has at least one charge line', !!comp);
    for (const f of [
      'id', 'kind', 'kindLabel', 'kindColor', 'kindIcon', 'label', 'amountRupees',
      'semester', 'semesterLabel', 'optional', 'firstYearOnly', 'sortOrder', 'note',
      'concessionRupees', 'netRupees',
    ]) {
      check(`a charge line carries "${f}"`, f in comp, `keys: ${Object.keys(comp).join(',')}`);
    }
    check('every charge line foots: net = amount − concession',
      d.components.every((c: any) => c.netRupees === c.amountRupees - c.concessionRupees));
    check('the tuition headline equals the sum of the tuition lines',
      d.tuitionRupees === d.components.filter((c: any) => c.kind === 'TUITION').reduce((s: number, c: any) => s + c.amountRupees, 0));
    check('the headline total equals the sum of every charge line',
      d.totalRupees === d.components.reduce((s: number, c: any) => s + c.amountRupees, 0));
    check('mandatory + optional equals the total',
      d.mandatoryRupees + d.optionalRupees === d.totalRupees);
    check('at least one charge is flagged optional, so the optional copy is exercised',
      d.components.some((c: any) => c.optional));

    console.log('\nconcession summary fields');
    for (const f of ['totalWaiverRupees', 'netAfterConcessionRupees', 'overCapCount', 'applied']) {
      check(`concessionSummary carries "${f}"`, f in d.concessionSummary);
    }
    const applied = d.concessionSummary.applied[0];
    if (applied) {
      for (const f of ['name', 'basis', 'appliesTo', 'eligibleRupees', 'waiverRupees', 'netRupees', 'shortfallRupees', 'overCap']) {
        check(`an applied concession carries "${f}"`, f in applied);
      }
      check('a concession never gives back more than its eligible base',
        d.concessionSummary.applied.every((a: any) => a.waiverRupees <= a.eligibleRupees));
      check('the net after concessions is never negative',
        d.concessionSummary.netAfterConcessionRupees >= 0);
    }

    console.log('\ninstalment fields');
    for (const f of ['count', 'frequency', 'frequencyLabel', 'firstDueDays', 'summary', 'stepDays', 'schedule']) {
      check(`the instalment config carries "${f}"`, f in d.installments);
    }
    const insRow = d.installments.schedule[0];
    for (const f of ['sequence', 'amountRupees', 'dueDate', 'dueDay']) {
      check(`an instalment row carries "${f}"`, f in insRow, `keys: ${Object.keys(insRow).join(',')}`);
    }
    check('the instalment schedule adds back up to the fee',
      d.installments.schedule.reduce((s: number, x: any) => s + x.amountRupees, 0) === d.totalRupees);
    check('an instalment due date arrives as a LOCAL day string, not a UTC-shifted one',
      typeof insRow.dueDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(insRow.dueDay), String(insRow.dueDay));

    console.log('\npenalty fields');
    for (const f of [
      'ruleId', 'ruleName', 'enabled', 'scope', 'graceDays', 'mode', 'valueBp', 'flatRupees',
      'capBp', 'maxMonths', 'summary', 'monthlyRupees', 'cappedRupees', 'capRupees',
    ]) {
      check(`the penalty block carries "${f}"`, f in d.penalty, `keys: ${Object.keys(d.penalty).join(',')}`);
    }
    check('the penalty summary is a sentence, not an id',
      typeof d.penalty.summary === 'string' && d.penalty.summary.length > 10);
    check('the monthly projection never exceeds the ceiling',
      d.penalty.monthlyRupees <= d.penalty.capRupees,
      `${d.penalty.monthlyRupees} vs ${d.penalty.capRupees}`);

    console.log('\nversion history fields');
    const history = versions.json.data;
    for (const f of ['structureId', 'program', 'academicYear', 'currentVersionId', 'items', 'total', 'timeline']) {
      check(`the version history carries "${f}"`, f in history);
    }
    const v = history.items[0];
    for (const f of [
      'id', 'versionNo', 'status', 'statusLabel', 'effectiveFromDay', 'effectiveToDay',
      'tuitionRupees', 'otherRupees', 'totalRupees', 'componentCount', 'changeNote',
      'createdByUserId', 'publishedByUserId', 'publishedAt', 'createdAt', 'isCurrent',
    ]) {
      check(`a version carries "${f}"`, f in v, `keys: ${Object.keys(v).join(',')}`);
    }
    const tl = history.timeline[0];
    for (const f of [
      'versionNo', 'status', 'effectiveFromDay', 'effectiveToDay', 'totalRupees',
      'priorVersionNo', 'deltaRupees', 'deltaPercent', 'changedLines', 'unchangedLines', 'diff',
    ]) {
      check(`a timeline entry carries "${f}"`, f in tl, `keys: ${Object.keys(tl).join(',')}`);
    }
    if (tl.diff?.length) {
      const diffRow = tl.diff[0];
      for (const f of ['label', 'kind', 'semesterLabel', 'beforeRupees', 'afterRupees', 'deltaRupees', 'status']) {
        check(`a diff row carries "${f}"`, f in diffRow);
      }
    }
    check('the seed gives at least one structure more than one version, so the timeline is exercised',
      history.total > 1, `${history.total}`);
    check('exactly one version is in force at a time',
      history.items.filter((x: any) => x.isCurrent).length === 1);
    // `items` arrives versionNo DESC, so index i-1 is NEWER than index i. Each
    // superseded version must END before its successor STARTS, or a date in the
    // overlap could price from either and the answer would depend on row order.
    check('no two versions share a day — the outgoing one closes before the next opens',
      (() => {
        const live = history.items
          .filter((x: any) => x.status === 'PUBLISHED' || x.status === 'SUPERSEDED')
          .sort((a: any, b: any) => a.versionNo - b.versionNo);
        for (let i = 1; i < live.length; i += 1) {
          const older = live[i - 1];
          const newer = live[i];
          if (!older.effectiveToDay) return false; // an open-ended older version is an overlap
          if (older.effectiveToDay >= newer.effectiveFromDay) return false;
        }
        return true;
      })());

    console.log('\neffective-date resolution');
    for (const f of [
      'structureId', 'onDate', 'onDay', 'resolved', 'version', 'message',
      'tuitionRupees', 'otherRupees', 'totalRupees', 'semester', 'semesterAmountRupees', 'semesterSchedule',
    ]) {
      check(`the resolve block carries "${f}"`, f in resolve.json.data,
        `keys: ${Object.keys(resolve.json.data).join(',')}`);
    }
    check('resolving today resolves, because a live version exists', resolve.json.data.resolved === true);
    check('the resolve message names a version', /\d/.test(resolve.json.data.message));
    check('the resolve echo is a LOCAL day string',
      /^\d{4}-\d{2}-\d{2}$/.test(resolve.json.data.onDay), String(resolve.json.data.onDay));
    check('the resolve semester grid foots to the resolved total',
      resolve.json.data.semesterSchedule.reduce((s: number, x: any) => s + x.amountRupees, 0) === resolve.json.data.totalRupees);

    // The whole point of the feature: an old date must price from the OLD version.
    const oldVersion = history.items.find((x: any) => x.status === 'SUPERSEDED' && x.effectiveFromDay);
    if (oldVersion) {
      const old = await api(`/api/v1/accounts/fee-structures/${id}/resolve?onDate=${oldVersion.effectiveFromDay}`, token);
      check('a date inside a superseded version\'s window still resolves',
        old.json?.data?.resolved === true, JSON.stringify(old.json?.data));
      check('and resolves to THAT version, not the live one',
        old.json?.data?.version?.versionNo === oldVersion.versionNo,
        `got v${old.json?.data?.version?.versionNo}, wanted v${oldVersion.versionNo}`);
      check('so a bill raised that day is priced at that day\'s rates',
        old.json.data.totalRupees === oldVersion.totalRupees,
        `${old.json.data.totalRupees} vs ${oldVersion.totalRupees}`);
    } else {
      check('the seed produces a superseded version to resolve against', false, 'none found');
    }

    // ── 3. Concessions list ───────────────────────────────────
    console.log('\nconcession rule fields');
    const rule = concessions.json.data.items[0];
    check('the seed has at least one concession rule', !!rule);
    if (rule) {
      for (const f of [
        'id', 'name', 'kind', 'basis', 'valueBp', 'percent', 'amountRupees', 'appliesTo',
        'appliesToLabel', 'semester', 'semesterLabel', 'enabled', 'note', 'eligibleRupees',
        'waiverRupees', 'valueLabel',
      ]) {
        check(`a concession rule carries "${f}"`, f in rule, `keys: ${Object.keys(rule).join(',')}`);
      }
      check('the value label is a phrase the office can read',
        typeof rule.valueLabel === 'string' && rule.valueLabel.length > 5);
    }
    check('the concession endpoint also sends the summary the calculator header uses',
      !!concessions.json.data.summary && 'totalWaiverRupees' in concessions.json.data.summary);

    // The calculator the concessions screen drives.
    const preview = await api(`/api/v1/accounts/fee-structures/${id}/concessions/preview`, token, 'POST', {});
    check('POST .../concessions/preview is 200', preview.status === 200, `${preview.status}`);
    for (const f of ['structureId', 'semester', 'semesterLabel', 'billRupees', 'waiverRupees', 'netRupees', 'lines', 'applied', 'overCapCount']) {
      check(`the preview carries "${f}"`, f in preview.json.data, `keys: ${Object.keys(preview.json.data).join(',')}`);
    }
    check('the preview foots: bill − waiver = net',
      preview.json.data.billRupees - preview.json.data.waiverRupees === preview.json.data.netRupees);
    check('the preview never waives more than the bill',
      preview.json.data.waiverRupees <= preview.json.data.billRupees);
    check('the preview returns a line per charge, with its own waiver',
      preview.json.data.lines.length === d.components.length);
    check('every preview line foots',
      preview.json.data.lines.every((l: any) => l.netRupees === l.amountRupees - l.concessionRupees));
    check('a disabled rule contributes nothing to the preview',
      preview.json.data.applied.every((a: any) => (a.enabled ? true : a.waiverRupees === 0)));

    const semPreview = await api(`/api/v1/accounts/fee-structures/${id}/concessions/preview`, token, 'POST', { semester: 1 });
    check('a semester preview prices less than the whole year',
      semPreview.json.data.billRupees < preview.json.data.billRupees,
      `${semPreview.json.data.billRupees} vs ${preview.json.data.billRupees}`);
    check('and labels the semester it priced',
      typeof semPreview.json.data.semesterLabel === 'string' && semPreview.json.data.semesterLabel.length > 0);

    // ── 4. The screens themselves ─────────────────────────────
    console.log('\nscreen sources exist and import what they claim to');
    const screens: Array<[string, string]> = [
      ['hub', path.join(FS_DIR, 'fee_structure.js')],
      ['detail', path.join(FS_DIR, 'pages', 'structure_detail', 'structure_detail.js')],
      ['editor', path.join(FS_DIR, 'pages', 'component_editor', 'component_editor.js')],
      ['versions', path.join(FS_DIR, 'pages', 'version_history', 'version_history.js')],
      ['concessions', path.join(FS_DIR, 'pages', 'concessions', 'concessions.js')],
      ['installments', path.join(FS_DIR, 'pages', 'installments', 'installments.js')],
      ['penalties', path.join(FS_DIR, 'pages', 'penalties', 'penalties.js')],
      ['meta', path.join(FS_DIR, 'feeStructureMeta.js')],
    ];
    const src: Record<string, string> = {};
    for (const [name, p] of screens) {
      check(`the ${name} screen exists`, existsSync(p), p);
      if (existsSync(p)) src[name] = readFileSync(p, 'utf8');
    }

    // The sub-pages are six levels below the role folder, so `services/api` is
    // '../../../../../../services/api' and the sibling meta module is
    // '../../feeStructureMeta'. Both have been got wrong before.
    for (const name of ['detail', 'editor', 'versions', 'concessions', 'installments', 'penalties']) {
      check(`the ${name} screen imports services/api at the right depth`,
        src[name].includes("'../../../../../../services/api'"),
        (src[name].match(/from '([^']*services\/api)'/) ?? [])[1]);
      check(`the ${name} screen imports the meta module at the right depth`,
        src[name].includes("'../../feeStructureMeta'"),
        (src[name].match(/from '([^']*feeStructureMeta)'/) ?? [])[1]);
    }
    check('the hub imports the meta module as a sibling',
      src.hub.includes("'./feeStructureMeta'"));
    check('no screen still imports the deleted mock constants file',
      !Object.values(src).some((s) => s.includes('feeStructureData')));

    // Every `navigate('X')` must be a registered FEATURE_MODULES key.
    console.log('\nevery navigate() target is registered');
    const registry = readFileSync(path.join(UI, 'accounts_finance.js'), 'utf8');
    const keys = new Set([...registry.matchAll(/^\s{2}([A-Za-z]+):\s*\{\s*title:/gm)].map((m) => m[1]));
    for (const name of ['hub', 'detail', 'editor', 'versions', 'concessions', 'installments', 'penalties']) {
      const targets = [...src[name].matchAll(/navigate\(\s*'([A-Za-z]+)'/g)].map((m) => m[1]);
      for (const t of targets) {
        check(`the ${name} screen navigates to a registered module (${t})`, keys.has(t),
          `FEATURE_MODULES has: ${[...keys].join(', ')}`);
      }
    }
    check('the six sub-screens are all registered',
      ['FeeStructureDetail', 'FeeStructureEditor', 'FeeStructureVersions',
        'FeeStructureConcessions', 'FeeStructureInstallments', 'FeeStructurePenalties']
        .every((k) => keys.has(k)));

    // Every API method a screen calls must exist on `accountsApi`.
    console.log('\nevery accountsApi method the screens call exists');
    const apiSrc = readFileSync(path.resolve('..', 'learnix', 'services', 'api.js'), 'utf8');
    const accountsBlock = apiSrc.slice(apiSrc.indexOf('export const accountsApi'));
    for (const m of new Set([...Object.values(src).flatMap((s) => [...s.matchAll(/accountsApi\.(\w+)\(/g)].map((x) => x[1]))])) {
      check(`accountsApi.${m} is defined`, new RegExp(`\\b${m}\\s*:`).test(accountsBlock));
    }

    // ── 5. Client/server constant agreement ───────────────────
    console.log('\nclient and server constants agree');
    const metaSrc = src.meta;
    for (const k of KIND_IDS) {
      check(`feeStructureMeta declares the ${k} charge type`, metaSrc.includes(`id: '${k}'`));
    }
    const clientKinds = new Set(
      (metaSrc.match(/id: '(TUITION|EXAMINATION|HOSTEL|LIBRARY|ADMISSION|TRANSPORT|OTHER)'/g) ?? [])
        .map((m) => m.slice(5, -1)),
    );
    check('feeStructureMeta declares exactly the server charge types',
      clientKinds.size === KIND_IDS.length && KIND_IDS.every((k) => clientKinds.has(k)),
      `client: ${[...clientKinds].join(',')} · server: ${KIND_IDS.join(',')}`);
    for (const k of CONCESSION_KINDS) {
      check(`feeStructureMeta declares the ${k.id} concession kind`, metaSrc.includes(`id: '${k.id}'`));
    }
    for (const f of INSTALLMENT_FREQUENCIES) {
      check(`feeStructureMeta declares the ${f.id} frequency`, metaSrc.includes(`id: '${f.id}'`));
    }
    for (const s of Object.keys(VERSION_STATUS_META)) {
      check(`feeStructureMeta declares the ${s} version status`, metaSrc.includes(`${s}:`));
    }
    check('feeStructureMeta offers every concession scope the server accepts',
      CONCESSION_SCOPES.every((s) => metaSrc.includes(`{ id: '${s.id}', label:`) || metaSrc.includes(`id: '${s.id}'`)));
    check('feeStructureMeta declares the local-day helper the date screens use',
      metaSrc.includes('export function isoDay'));
    check('feeStructureMeta declares the single rupees→paise conversion',
      metaSrc.includes('export const toMinor'));
    check('feeStructureMeta handles a null year-on-year figure as a fact, not a zero',
      metaSrc.includes('No earlier version to compare'));
    check('feeStructureMeta renders the inclusive end of a version window',
      metaSrc.includes('inclusive'));

    // The editor posts money; it must go up as paise through the shared helper.
    check('the editor converts rupees to paise before posting',
      src.editor.includes('toMinor(') && src.editor.includes('amountMinor:'));
    check('the concessions editor converts a percentage to basis points',
      src.concessions.includes('Math.round(Number(form.percent) * 100)'));

    // The instalments screen mirrors the server split; both must place every paise.
    check('the instalments screen mirrors the server split rule',
      src.installments.includes('Math.floor(total / n)') && src.installments.includes('remainder'));

    // The penalties screen must NOT re-derive the fine; it shows the server's.
    check('the penalties screen reads the server-computed penalty figures',
      src.penalties.includes('p.monthlyRupees') && src.penalties.includes('p.capRupees'));
    check('the penalties screen points at the screen that actually owns the policy',
      src.penalties.includes("navigate('LateFeePolicy')"));

    console.log('\nall money on the wire is whole rupees');
    check('every list row money field is an integer',
      [first.tuitionRupees, first.otherRupees, first.totalRupees, first.mandatoryRupees,
        first.optionalRupees, first.concessionWaiverRupees, first.netAfterConcessionRupees,
        first.projectedAnnualCollectionRupees, list.json.data.stats.annualTotalRupees,
        list.json.data.stats.averageRupees]
        .every((v: unknown) => Number.isInteger(v)));
    check('every detail money field is an integer',
      [d.tuitionRupees, d.otherRupees, d.totalRupees, d.mandatoryRupees, d.optionalRupees]
        .every((v: unknown) => Number.isInteger(v)));
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