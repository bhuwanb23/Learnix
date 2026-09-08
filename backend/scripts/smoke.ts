// End-to-end smoke test — runs against a live server.
// Usage: BASE_URL=http://localhost:4000 npx tsx scripts/smoke.ts
// Exits 1 on any failure. Designed for CI: fast, read-mostly, self-contained.
import { sha256 } from '../src/lib/hash.js';

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

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; roles: string[]; institutionId: string };
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

async function main() {
  console.log(`\nLearnix smoke test → ${BASE}\n`);

  // ── 1. Health ──
  console.log('Health');
  {
    const { status, json } = await api('/health');
    check('GET /health → 200 ok', status === 200 && json?.data?.status === 'ok');
  }

  // ── 2. Auth core ──
  console.log('Auth');
  const student = await login('student@learnix.dev');
  const teacher = await login('teacher@learnix.dev');
  const admin = await login('admin@learnix.dev');
  const platform = await login('platform@learnix.dev');
  check('student login returns STUDENT role', student.user.roles.includes('STUDENT'));
  check('teacher login returns TEACHER role', teacher.user.roles.includes('TEACHER'));
  check('admin login returns ADMIN role', admin.user.roles.includes('ADMIN'));
  check('platform login returns PLATFORM_ADMIN role', platform.user.roles.includes('PLATFORM_ADMIN'));

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
    // X-02 password reset flow (dev returns token)
    const f = await api('/api/v1/auth/forgot-password', undefined, {
      method: 'POST',
      body: JSON.stringify({ email: 'teacher@learnix.dev' }),
    });
    check('forgot-password ok', f.status === 200 && f.json?.data?.ok === true);
  }

  // ── 3. Role dashboards ──
  console.log('Role dashboards');
  {
    const { status, json } = await api('/api/v1/student/dashboard', student.accessToken);
    check('student dashboard', status === 200 && json?.data != null);
  }
  {
    const { status, json } = await api('/api/v1/teacher/dashboard', teacher.accessToken);
    check('teacher dashboard', status === 200 && json?.data != null);
  }
  {
    const { status, json } = await api('/api/v1/admin/dashboard', admin.accessToken);
    check('admin dashboard', status === 200 && json?.data != null);
  }

  // ── 4. Cross-role access control ──
  console.log('Access control');
  {
    const { status } = await api('/api/v1/admin/dashboard', student.accessToken);
    check('student → admin endpoint denied', status === 403);
  }
  {
    const { status } = await api('/api/v1/platform/institutions', teacher.accessToken);
    check('teacher → platform endpoint denied', status === 403);
  }
  {
    const { status } = await api('/api/v1/student/dashboard', 'invalid.token.here');
    check('invalid token → 401', status === 401);
  }

  // ── 5. Platform module ──
  console.log('Platform');
  {
    const { status, json } = await api('/api/v1/platform/institutions', platform.accessToken);
    const insts = json?.data?.institutions;
    check('platform lists institutions', status === 200 && Array.isArray(insts) && insts.length > 0);
    if (Array.isArray(insts) && insts.length > 0) {
      const id = insts[0].id;
      const md = await api(`/api/v1/platform/institutions/${id}/master-data`, platform.accessToken);
      check('master data readable', md.status === 200 && md.json?.data?.departments != null);
      const rbac = await api(`/api/v1/platform/institutions/${id}/rbac`, platform.accessToken);
      check(
        'RBAC map present',
        rbac.status === 200 && (rbac.json?.data?.permissionGroups?.length ?? 0) > 0,
      );
    }
  }

  // ── Summary ──
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
