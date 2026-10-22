/**
 * HD-05 — a live smoke test of the Students desk, as the seeded HOD.
 */
import { prisma } from '../src/db/prisma.js';

const BASE = process.env.BASE_URL ?? 'http://localhost:4000/api/v1';

async function main() {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hod@learnix.dev', password: 'Passw0rd!' }),
  });
  const body = (await login.json()) as any;
  const token = body?.data?.accessToken ?? body?.data?.token ?? body?.accessToken;
  if (!token) throw new Error(`login failed: ${JSON.stringify(body).slice(0, 200)}`);
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const get = async (path: string) => {
    const r = await fetch(`${BASE}${path}`, { headers: auth });
    return { status: r.status, data: ((await r.json()) as any)?.data };
  };

  const cat = await get('/hod/students/catalogue');
  console.log(
    `catalogue  ${cat.status}  signals=${cat.data?.riskSignals?.length} states=${cat.data?.riskStates?.length} types=${cat.data?.interventionTypes?.length}`,
  );

  const dir = await get('/hod/students/directory');
  console.log(
    `directory ${dir.status}  students=${dir.data?.totals?.students} atRisk=${dir.data?.totals?.atRisk} watch=${dir.data?.totals?.watch} unmeasured=${dir.data?.totals?.unmeasured} ok=${dir.data?.totals?.ok} ready=${dir.data?.totals?.placementReady} interventions=${dir.data?.totals?.interventions}`,
  );
  for (const s of dir.data?.students ?? []) {
    console.log(
      `  ${s.rollNo.padEnd(14)} ${s.name.padEnd(16)} ${String(s.risk.state).padEnd(11)} signals=[${s.risk.signals.join(',')}] att=${s.attendance.attendancePct ?? '—'}% pass=${s.results.passRate ?? '—'}% cgpa=${s.results.cgpa ?? '—'} gap=${s.gap ?? '—'} asg=${s.assignments.completionPct ?? '—'}%`,
    );
  }
  console.log(`atRisk list: ${(dir.data?.atRisk ?? []).map((a: any) => a.name).join(', ') || 'none'}`);

  const first = dir.data?.students?.find((s: any) => s.risk.signals.length > 0);
  if (first) {
    const d = await get(`/hod/students/${first.studentProfileId}/detail`);
    console.log(
      `detail    ${d.status}  ${d.data?.student?.name} | att=${d.data?.attendance?.attendancePct ?? '—'}% streak=${d.data?.attendance?.longestAbsenceStreak} subjects=${d.data?.subjects?.length} decline=${d.data?.performance?.decline ?? '—'} failed=${d.data?.performance?.failedCourses?.length} weakTopic=${d.data?.weakTopics?.course?.code ?? '—'} interventions=${d.data?.interventions?.length} suggestions=${d.data?.suggestions?.length}`,
    );
    for (const sg of d.data?.suggestions ?? []) {
      console.log(`    suggestion: ${sg.type} — ${sg.title} :: ${sg.notes}`);
    }
    for (const iv of d.data?.interventions ?? []) {
      console.log(`    intervention: ${iv.type} ${iv.status} — ${iv.title}`);
    }
  }

  const old = await get('/hod/students');
  console.log(`old route ${old.status}  students=${old.data?.students?.length ?? 'n/a'}`);
}

main().finally(() => prisma.$disconnect());
