// End-to-end smoke test — runs against a live server.
// Usage: BASE_URL=http://localhost:4000 npx tsx scripts/smoke.ts
// Exits 1 on any failure. Designed for CI: fast, read-mostly, self-contained.

const BASE = process.env.BASE_URL ?? 'http://localhost:4000';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'Passw0rd!';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    failures.push(name + (detail ? ` — ${detail}` : ''));
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function api(
  path: string,
  token?: string,
  init?: RequestInit,
): Promise<{ status: number; json: any }> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json };
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; roles: string[]; institutionId: string };
}

async function login(email: string): Promise<LoginResult> {
  const { status, json } = await api('/api/v1/auth/login', undefined, {
    method: 'POST',
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (status !== 200 || !json?.data?.accessToken) {
    throw new Error(`login failed for ${email}: ${status} ${JSON.stringify(json)}`);
  }
  return json.data;
}

// ── Role definitions ──────────────────────────────────────────────
// Each entry: { name, email, dashboardPath, expectedRole }
// The smoke test logs in, checks the role in the JWT, hits the dashboard, then
// verifies that a student token is rejected (403) on this dashboard.
const ROLES = [
  { name: 'Student',   email: 'student@learnix.dev',   dash: '/api/v1/student/dashboard',   role: 'STUDENT' },
  { name: 'Teacher',   email: 'teacher@learnix.dev',   dash: '/api/v1/teacher/dashboard',   role: 'TEACHER' },
  { name: 'Admin',     email: 'admin@learnix.dev',     dash: '/api/v1/admin/dashboard',     role: 'ADMIN' },
  { name: 'HOD',       email: 'hod@learnix.dev',       dash: '/api/v1/hod/dashboard',       role: 'HOD' },
  { name: 'ExamCell',  email: 'examcell@learnix.dev',  dash: '/api/v1/examcell/dashboard',  role: 'EXAMCELL' },
  { name: 'Placement', email: 'placement@learnix.dev', dash: '/api/v1/placement/dashboard', role: 'PLACEMENT' },
  { name: 'Accounts',  email: 'accounts@learnix.dev',  dash: '/api/v1/accounts/dashboard',  role: 'ACCOUNTS' },
  { name: 'Library',   email: 'library@learnix.dev',   dash: '/api/v1/library/dashboard',   role: 'LIBRARY' },
  { name: 'Hostel',    email: 'hostel@learnix.dev',    dash: '/api/v1/hostel/dashboard',    role: 'HOSTEL' },
  { name: 'Transport', email: 'transport@learnix.dev', dash: '/api/v1/transport/dashboard', role: 'TRANSPORT' },
  { name: 'Sports',    email: 'sports@learnix.dev',    dash: '/api/v1/sports/dashboard',    role: 'SPORTS' },
  { name: 'Alumni',    email: 'priya@learnix.dev',     dash: '/api/v1/alumni/dashboard',    role: 'ALUMNI' },
] as const;

async function main() {
  console.log(`\nLearnix smoke test → ${BASE}\n`);

  // ── 1. Health ──────────────────────────────────────────────────
  console.log('Health');
  {
    const { status, json } = await api('/health');
    check('GET /health → 200 ok', status === 200 && json?.data?.status === 'ok');
    check('database reachable', json?.data?.checks?.database === 'ok');
  }

  // ── 2. Auth core ───────────────────────────────────────────────
  console.log('Auth');
  const student = await login('student@learnix.dev');
  check('student login returns STUDENT role', student.user.roles.includes('STUDENT'));

  {
    const { status, json } = await api('/api/v1/auth/me', student.accessToken);
    check('GET /auth/me → profile', status === 200 && json?.data?.email === 'student@learnix.dev');
  }
  {
    // refresh rotation: old token must not be reusable
    const r1 = await api('/api/v1/auth/refresh', undefined, {
      method: 'POST',
      body: JSON.stringify({ refreshToken: student.refreshToken }),
    });
    const ok1 = r1.status === 200 && r1.json?.data?.accessToken;
    check('refresh rotates token', ok1);
    if (ok1) {
      const r2 = await api('/api/v1/auth/refresh', undefined, {
        method: 'POST',
        body: JSON.stringify({ refreshToken: student.refreshToken }),
      });
      check('refresh reuse rejected (family revoke)', r2.status === 401 || r2.status === 403);
    }
  }
  {
    const { status } = await api('/api/v1/auth/login', undefined, {
      method: 'POST',
      body: JSON.stringify({ email: 'student@learnix.dev', password: 'wrong-password' }),
    });
    check('wrong password → 401', status === 401);
  }
  {
    const f = await api('/api/v1/auth/forgot-password', undefined, {
      method: 'POST',
      body: JSON.stringify({ email: 'teacher@learnix.dev' }),
    });
    check('forgot-password ok', f.status === 200 && f.json?.data?.ok === true);
  }

  // ── 3. All role dashboards (login → dashboard) ─────────────────
  // This catches the class of bug where module-scope setDemoUser causes
  // the wrong role's token to be used on the wrong dashboard.
  console.log('Role dashboards (all 12 institution roles)');
  const tokens: Record<string, LoginResult> = {};

  for (const r of ROLES) {
    try {
      const result = await login(r.email);
      tokens[r.name] = result;

      // Check JWT contains expected role
      const hasRole = result.user.roles.includes(r.role);
      check(
        `${r.name} login → JWT has ${r.role} role`,
        hasRole,
        hasRole ? undefined : `got ${JSON.stringify(result.user.roles)}`,
      );

      // Hit the dashboard endpoint
      const { status, json } = await api(r.dash, result.accessToken);
      check(
        `${r.name} dashboard (${r.dash}) → 200`,
        status === 200 && json?.data != null,
        status !== 200 ? `got ${status}` : undefined,
      );
    } catch (err: any) {
      check(`${r.name} login+dashboard`, false, err.message);
    }
  }

  // ── 4. Cross-role RBAC (every role can't access every other) ───
  // The key regression: student token must not work on /placement/dashboard etc.
  console.log('Cross-role access control');

  // Student token should be denied on ALL non-student dashboards
  const studentToken = tokens['Student']?.accessToken;
  if (studentToken) {
    for (const r of ROLES.filter((r) => r.name !== 'Student')) {
      const { status } = await api(r.dash, studentToken);
      check(
        `student → ${r.name} dashboard denied`,
        status === 403,
        status !== 403 ? `got ${status}` : undefined,
      );
    }
  }

  // Platform endpoints should be denied by all institution roles
  const platformPaths = ['/platform/institutions'];
  for (const r of ROLES) {
    const tok = tokens[r.name]?.accessToken;
    if (!tok) continue;
    for (const p of platformPaths) {
      const { status } = await api(`/api/v1${p}`, tok);
      check(
        `${r.name} → ${p} denied`,
        status === 403,
        status !== 403 ? `got ${status}` : undefined,
      );
    }
  }

  {
    const { status } = await api('/api/v1/student/dashboard', 'invalid.token.here');
    check('invalid token → 401/403', status === 401 || status === 403);
  }

  // ── 5. Module smoke (representative endpoints per module) ──────
  console.log('Module endpoints');
  {
    // Student: classes, fees, notifications
    const t = tokens['Student']?.accessToken;
    if (t) {
      const classes = await api('/api/v1/student/classes', t);
      check('student classes', classes.status === 200);
      const fees = await api('/api/v1/student/fees', t);
      check('student fees', fees.status === 200);
      const notif = await api('/api/v1/student/notifications', t);
      check('student notifications', notif.status === 200);
    }
  }
  {
    // Teacher: classes, schedule
    const t = tokens['Teacher']?.accessToken;
    if (t) {
      const classes = await api('/api/v1/teacher/classes', t);
      check('teacher classes', classes.status === 200);
      const schedule = await api('/api/v1/teacher/schedule', t);
      check('teacher schedule', schedule.status === 200);
    }
  }
  {
    // Admin: students list, departments, announcements
    const t = tokens['Admin']?.accessToken;
    if (t) {
      const students = await api('/api/v1/admin/students', t);
      check('admin students list', students.status === 200 && Array.isArray(students.json?.data));
      const depts = await api('/api/v1/admin/departments', t);
      check('admin departments', depts.status === 200);
    }
  }
  {
    // HOD: faculty, syllabus
    const t = tokens['HOD']?.accessToken;
    if (t) {
      const fac = await api('/api/v1/hod/faculty', t);
      check('hod faculty', fac.status === 200);
    }
  }
  {
    // Placement: companies, jobs, drives
    const t = tokens['Placement']?.accessToken;
    if (t) {
      const companies = await api('/api/v1/placement/companies', t);
      check('placement companies', companies.status === 200);
      const jobs = await api('/api/v1/placement/jobs', t);
      check('placement jobs', jobs.status === 200);
      const drives = await api('/api/v1/placement/drives', t);
      check('placement drives', drives.status === 200);
    }
  }
  {
    // Accounts: collections, ledger
    const t = tokens['Accounts']?.accessToken;
    if (t) {
      const collections = await api('/api/v1/accounts/collections', t);
      check('accounts collections', collections.status === 200);
      const ledger = await api('/api/v1/accounts/ledger', t);
      check('accounts ledger', ledger.status === 200);
    }
  }
  {
    // Library: catalog, dashboard
    const t = tokens['Library']?.accessToken;
    if (t) {
      const catalog = await api('/api/v1/library/catalog', t);
      check('library catalog', catalog.status === 200);
    }
  }
  {
    // Hostel: rooms, residents
    const t = tokens['Hostel']?.accessToken;
    if (t) {
      const rooms = await api('/api/v1/hostel/rooms', t);
      check('hostel rooms', rooms.status === 200);
    }
  }
  {
    // Transport: routes, fleet
    const t = tokens['Transport']?.accessToken;
    if (t) {
      const routes = await api('/api/v1/transport/routes', t);
      check('transport routes', routes.status === 200);
    }
  }
  {
    // Sports: events, teams
    const t = tokens['Sports']?.accessToken;
    if (t) {
      const events = await api('/api/v1/sports/events', t);
      check('sports events', events.status === 200);
    }
  }
  {
    // ExamCell: timetable, evaluations
    const t = tokens['ExamCell']?.accessToken;
    if (t) {
      const exams = await api('/api/v1/examcell/timetable', t);
      check('examcell timetable', exams.status === 200);
    }
  }
  {
    // Alumni: directory, events
    const t = tokens['Alumni']?.accessToken;
    if (t) {
      const dir = await api('/api/v1/alumni/directory', t);
      check('alumni directory', dir.status === 200);
    }
  }

  // ── Summary ────────────────────────────────────────────────────
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err.message);
  process.exit(1);
});
