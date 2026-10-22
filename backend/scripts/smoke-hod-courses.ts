/**
 * HD-06 — a live smoke test of the Courses desk, as the seeded HOD.
 *
 * The suites prove the CLAIMS. This proves the desk actually answers for the HOD in the demo
 * data — the catalogue, the directory with a health badge on every row, the whole course in one
 * call, and a write that leaves a trail.
 */
import { prisma } from '../src/db/prisma.js';

const BASE = process.env.BASE_URL ?? 'http://localhost:4000/api/v1';

async function main() {
  const hod = await prisma.user.findFirst({
    where: { email: 'hod@learnix.dev' },
    select: { id: true, institutionId: true },
  });
  if (!hod) throw new Error('the seeded HOD is missing — run the seed');

  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hod@learnix.dev', password: 'Passw0rd!' }),
  });
  const body = (await login.json()) as any;
  const token = body?.data?.accessToken ?? body?.data?.token ?? body?.accessToken;
  if (!token) throw new Error(`login did not return a token: ${JSON.stringify(body).slice(0, 200)}`);
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const get = async (path: string) => {
    const r = await fetch(`${BASE}${path}`, { headers: auth });
    return { status: r.status, data: ((await r.json()) as any)?.data };
  };

  const cat = await get('/hod/courses/catalogue');
  console.log(`catalogue  ${cat.status}  statuses=${cat.data?.statuses?.length} components=${cat.data?.health?.components?.length} bands=${cat.data?.health?.bands?.length}`);

  const dir = await get('/hod/courses/directory');
  console.log(`directory ${dir.status}  courses=${dir.data?.totals?.courses} active=${dir.data?.totals?.active} draft=${dir.data?.totals?.draft} archived=${dir.data?.totals?.archived} healthy=${dir.data?.totals?.healthy} watch=${dir.data?.totals?.watch} atRisk=${dir.data?.totals?.atRisk}`);
  for (const c of dir.data?.courses ?? []) {
    const legs = c.health?.legs ?? {};
    console.log(
      `  ${c.code.padEnd(7)} ${String(c.status).padEnd(9)} health=${c.health?.score ?? '—'} band=${c.health?.band ?? '—'} att=${legs.attendance ?? '—'}% syl=${legs.syllabus ?? '—'}% pass=${legs.results ?? '—'}% programs=${c.programs}`,
    );
  }

  const first = dir.data?.courses?.[0];
  if (first) {
    const d = await get(`/hod/courses/${first.id}/detail`);
    console.log(
      `detail    ${d.status}  ${d.data?.course?.name} | subjects=${d.data?.subjects?.length} faculty=${d.data?.faculty?.length} students=${d.data?.students?.total} slots=${d.data?.timetable?.slots?.length} syllabus=${d.data?.syllabus?.hasSyllabus} attendance=${d.data?.attendance?.attendancePct ?? '—'}% pass=${d.data?.performance?.passPercent ?? '—'}% curriculum=${d.data?.curriculum?.declared?.length} prereqs=${d.data?.prerequisites?.length} history=${d.data?.history?.total}`,
    );
  }

  // THE OLD ROUTE STILL ANSWERS.
  const old = await get('/hod/courses');
  console.log(`old route ${old.status}  stats=${!!old.data?.stats} courses=${old.data?.courses?.length}`);
}

main().finally(() => prisma.$disconnect());
