import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const dept = await db.department.findFirst({ where: { code: 'CSE' }, select: { id: true } });
  const courses = await db.course.findMany({
    where: { departmentId: dept?.id },
    select: {
      code: true,
      status: true,
      offerings: {
        select: {
          id: true,
          _count: { select: { enrollments: true, scheduleSlots: true } },
        },
      },
      syllabusVersions: { select: { version: true, status: true } },
    },
  });
  for (const c of courses) {
    const enr = c.offerings.reduce((s, o) => s + o._count.enrollments, 0);
    const slots = c.offerings.reduce((s, o) => s + o._count.scheduleSlots, 0);
    console.log(c.code, c.status, 'offerings=' + c.offerings.length, 'enr=' + enr, 'slots=' + slots, 'syl=' + c.syllabusVersions.map((s) => `v${s.version}:${s.status}`).join(','));
  }
  const results = await db.result.count();
  const att = await db.attendanceRecord.count();
  console.log('results', results, 'attendanceRecords', att);
}

main().finally(() => db.$disconnect());
