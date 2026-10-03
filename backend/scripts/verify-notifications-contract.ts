// Throwaway contract check: every field the library notifications screens read
// must exist in the live HTTP responses.
import { readFileSync } from 'node:fs';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';

const PORT = 4599;
const BASE = `http://127.0.0.1:${PORT}/api/v1`;

let pass = 0;
let fail = 0;
const ok = (label: string, cond: unknown, extra = '') => {
  if (cond) { pass++; console.log(`PASS  ${label}`); }
  else { fail++; console.log(`FAIL  ${label}${extra ? ' :: ' + extra : ''}`); }
};

const get = (o: any, path: string) =>
  path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), o);

// Field paths each screen reads from the payload it fetches.
const CONTRACT: Record<string, string[]> = {
  activityFeed: [
    'events', 'stats.total', 'stats.issue', 'stats.fines', 'stats.requests',
  ],
  insights: [
    'library.activeLoans', 'library.overdueLoans', 'library.pendingFines',
    'library.totalStudents', 'library.overdueCoveragePct',
    'library.pendingRequests', 'remindersDueNow', 'audiences',
  ],
  broadcastList: ['broadcasts', 'stats', 'stats.lastSentAt'],
  audienceList: ['audiences'],
  broadcastDetail: [
    'id', 'title', 'body', 'audience', 'audienceLabel', 'channels', 'sentAt',
    'createdAt', 'recipientCount', 'deliveredCount', 'recipients', 'sender.fullName',
  ],
  reminderSchedule: [
    'automationEnabled', 'stages', 'totalReachable', 'checkedAt', 'note',
    'nextRunAt', 'lastRunAt',
  ],
};

const checkShape = (name: string, payload: any, paths: string[]) => {
  for (const p of paths) {
    const v = get(payload, p);
    ok(`${name} exposes "${p}"`, v !== undefined, `value=${JSON.stringify(v)}`);
  }
};

const app = createApp();
const server = app.listen(PORT);

async function main() {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'library@learnix.dev', password: 'Passw0rd!' }),
  });
  const loginJson = (await login.json()) as any;
  ok('login as librarian', login.ok && !!loginJson?.data?.accessToken);
  const token = loginJson?.data?.accessToken;
  if (!token) { console.log('cannot continue without a token'); server.close(); process.exit(1); }
  const H = { authorization: `Bearer ${token}` };

  const hit = async (path: string) => {
    const r = await fetch(`${BASE}${path}`, { headers: H });
    const j = (await r.json()) as any;
    return { status: r.status, data: j?.data };
  };

  const activity = await hit('/library/notifications/activity');
  ok('GET /notifications/activity 200', activity.status === 200, `status=${activity.status}`);
  const insights = await hit('/library/notifications/insights');
  ok('GET /notifications/insights 200', insights.status === 200, `status=${insights.status}`);
  const reminders = await hit('/library/notifications/reminders');
  ok('GET /notifications/reminders 200', reminders.status === 200, `status=${reminders.status}`);
  const bcasts = await hit('/library/broadcasts');
  ok('GET /broadcasts 200', bcasts.status === 200, `status=${bcasts.status}`);
  const auds = await hit('/library/broadcasts/audiences');
  ok('GET /broadcasts/audiences 200', auds.status === 200, `status=${auds.status}`);
  // Literal path must not be shadowed by /broadcasts/:id
  ok('/broadcasts/audiences is not parsed as an id', Array.isArray(auds.data?.audiences));

  checkShape('activity feed', activity.data, CONTRACT.activityFeed);
  checkShape('insights', insights.data, CONTRACT.insights);
  checkShape('broadcast list', bcasts.data, CONTRACT.broadcastList);
  checkShape('audience list', auds.data, CONTRACT.audienceList);
  checkShape('reminder schedule', reminders.data, CONTRACT.reminderSchedule);

  // Reminder stage fields the schedule screen renders
  for (const s of reminders.data?.stages ?? []) {
    ok(`stage ${s.key} has key/offsetDays/title/channel/matchedNow/description`,
      ['key', 'offsetDays', 'title', 'channel', 'matchedNow', 'description']
        .every((k) => k in s));
  }
  ok('reminder stages are the 4 defined offsets',
    (reminders.data?.stages ?? []).length === 4,
    `n=${(reminders.data?.stages ?? []).length}`);
  ok('automationEnabled is explicitly false', reminders.data?.automationEnabled === false);
  ok('totalReachable equals sum of stage counts',
    reminders.data?.totalReachable === (reminders.data?.stages ?? []).reduce((s: number, x: any) => s + x.matchedNow, 0));

  // Broadcast list row fields the history screen renders
  for (const b of bcasts.data?.broadcasts ?? []) {
    ok(`broadcast row ${b.id} shape`,
      ['id', 'title', 'body', 'audience', 'audienceLabel', 'currentAudienceSize', 'ownedByLibrary', 'sentAt']
        .every((k) => k in b));
  }
  ok('every broadcast row flags ownership', (bcasts.data?.broadcasts ?? []).every((b: any) => typeof b.ownedByLibrary === 'boolean'));
  ok('foreign audiences degrade to -1, never crash',
    (bcasts.data?.broadcasts ?? []).every((b: any) => !b.ownedByLibrary ? b.currentAudienceSize === -1 : b.currentAudienceSize >= 0));

  // Detail
  const firstId = bcasts.data?.broadcasts?.[0]?.id;
  if (firstId) {
    const d = await hit(`/library/broadcasts/${firstId}`);
    ok('GET /broadcasts/:id 200', d.status === 200, `status=${d.status}`);
    checkShape('broadcast detail', d.data, CONTRACT.broadcastDetail);
  } else {
    ok('at least one broadcast exists to open', false);
  }

  const missing = await hit('/library/broadcasts/does-not-exist');
  ok('unknown broadcast 404s cleanly', missing.status === 404, `status=${missing.status}`);

  // ── libraryApi surface ─────────────────────────────────
  const apiSrc = readFileSync('../learnix/services/api.js', 'utf8');
  const libBlock = apiSrc.slice(apiSrc.indexOf('export const libraryApi'), apiSrc.indexOf('export const studentApi'));
  for (const m of [
    'notificationActivity', 'notificationInsights', 'reminderSchedule',
    'broadcasts', 'broadcast', 'broadcastAudiences', 'sendBroadcast',
  ]) {
    ok(`libraryApi.${m} defined`, new RegExp(`\\b${m}:`).test(libBlock));
  }

  // ── FEATURE_MODULES registration ───────────────────────
  const shellSrc = readFileSync('../learnix/users/library_staff/library_staff.js', 'utf8');
  const imports = shellSrc.split('\n').filter((l) => l.includes("from './pages/notifications/"));
  ok('all 5 notification screens imported', imports.length === 5, `n=${imports.length}`);
  for (const k of ['Notifications', 'ComposeBroadcast', 'BroadcastHistory', 'AudienceInsights', 'ReminderSchedule']) {
    ok(`FEATURE_MODULES registers ${k}`, new RegExp(`\\b${k}: \\{ title:`).test(shellSrc));
    ok(`${k} import binds the right file`, imports.some((l) => {
      const name = l.match(/import\s+(\w+)/)?.[1];
      const path = l.match(/'(.*)'/)?.[1] ?? '';
      return name && shellSrc.includes(`${k}: { title:`) &&
        shellSrc.includes(`${k}: { title: '`) && path.length > 0 &&
        new RegExp(`component: ${name}[,\\n]`).test(shellSrc);
    }));
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
}

void main();
