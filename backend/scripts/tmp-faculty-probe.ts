import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const dept = await db.department.findFirst({ where: { code: 'CSE' }, select: { id: true } });
  const offerings = await db.courseOffering.findMany({
    where: { section: { program: { departmentId: dept?.id } } },
    select: {
      id: true,
      teacherUserId: true,
      course: { select: { code: true, name: true } },
      section: { select: { name: true, batchId: true, batch: { select: { name: true, startYear: true } } } },
      academicYear: { select: { name: true } },
      _count: { select: { scheduleSlots: true, enrollments: true } },
    },
  });
  const users = await db.user.findMany({
    where: { id: { in: [...new Set(offerings.map((o) => o.teacherUserId))] } },
    select: { id: true, email: true },
  });
  const map = new Map(users.map((u) => [u.id, u.email]));
  for (const o of offerings) {
    console.log(
      `${o.course.code} ${o.course.name} | ${o.section.name} | ${map.get(o.teacherUserId)} | ${o.academicYear.name} | slots=${o._count.scheduleSlots} enr=${o._count.enrollments}`,
    );
  }
  const staff = await db.staffProfile.findMany({
    where: { departmentId: dept?.id },
    select: { user: { select: { email: true } }, maxWorkloadHours: true, designation: true },
  });
  console.log('--- staff ---');
  for (const s of staff) console.log(`${s.user.email} max=${s.maxWorkloadHours} ${s.designation ?? ''}`);
}

main().finally(() => db.$disconnect());
