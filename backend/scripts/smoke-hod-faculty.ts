/**
 * HD-02 — a live smoke test of the Faculty desk, as the seeded HOD.
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

  const cat = await get('/hod/faculty/catalogue');
  console.log(
    `catalogue  ${cat.status}  bands=${cat.data?.workloadBands?.length} legs=${cat.data?.insightLegs?.length} days=${cat.data?.availabilityDays?.length}`,
  );

  const dir = await get('/hod/faculty/directory');
  console.log(
    `directory ${dir.status}  faculty=${dir.data?.totals?.faculty} active=${dir.data?.totals?.active} onLeave=${dir.data?.totals?.onLeave} overloaded=${dir.data?.totals?.overloaded} underutilised=${dir.data?.totals?.underutilised} available=${dir.data?.totals?.available}`,
  );
  for (const f of dir.data?.faculty ?? []) {
    const w = f.workload;
    console.log(
      `  ${f.name.padEnd(18)} ${String(f.status).padEnd(9)} ${w.assignedWeeklyHours}/${w.maxWorkloadHours}h = ${w.utilizationPct}% ${w.band.padEnd(13)} insight=${f.insight.score ?? '—'} free=${w.freeHours}h subjects=${f.subjects.length}`,
    );
  }

  console.log(
    `balancer  overloaded=${dir.data?.balancer?.overloaded?.length} available=${dir.data?.balancer?.available?.length} note=${dir.data?.balancer?.note ?? '—'}`,
  );
  for (const o of dir.data?.balancer?.overloaded ?? []) {
    console.log(
      `  ${o.name} over by ${o.overBy}h -> targets: ${o.targets.map((t: any) => `${t.name}(${t.freeHours}h)`).join(', ') || 'none'}`,
    );
  }
  console.log(
    `matrix    ${dir.data?.availability?.rows?.length} rows x ${dir.data?.availability?.days?.length} days`,
  );
  for (const r of dir.data?.availability?.rows ?? []) {
    console.log(
      `  ${r.name.padEnd(18)} ${r.days.map((d: any) => `${d.short}:${d.hours}`).join(' ')} free=${r.freeHours}h${r.onLeaveNow ? ' ON LEAVE' : ''}`,
    );
  }
  console.log(
    `progress  syllabusTracked=${dir.data?.progress?.summary?.syllabusTracked} deliveryTracked=${dir.data?.progress?.summary?.deliveryTracked} stale=${dir.data?.progress?.summary?.staleSyllabi}`,
  );

  const first = dir.data?.faculty?.find((f: any) => f.subjects.length > 0);
  if (first) {
    const d = await get(`/hod/faculty/${first.userId}/detail`);
    console.log(
      `detail    ${d.status}  ${d.data?.faculty?.name} | subjects=${d.data?.subjects?.length} classes=${d.data?.classes?.length} att=${d.data?.attendance?.pct ?? '—'}% pass=${d.data?.performance?.passPercent ?? '—'}% syllabus=${d.data?.syllabus?.percent ?? '—'}% activity=${JSON.stringify(d.data?.activity)?.slice(0, 90)}`,
    );
  }

  const old = await get('/hod/faculty');
  console.log(`old route ${old.status}  list=${Array.isArray(old.data) ? old.data.length : 'n/a'}`);
}

main().finally(() => prisma.$disconnect());
