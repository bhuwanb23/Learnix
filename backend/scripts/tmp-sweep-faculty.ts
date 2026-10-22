/**
 * A one-off sweep of the debris the HOD Faculty suite left behind while it was failing.
 *
 * The suite's own cleanup is correct now; this clears the rows the FAILED runs left, so the demo
 * database is clean and the next run's counts are honest.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const insts = await db.institution.findMany({
    where: { name: { contains: 'HOD Faculty Check' } },
    select: { id: true, name: true },
  });
  for (const i of insts) {
    const users = await db.user.findMany({ where: { institutionId: i.id }, select: { id: true } });
    const ids = users.map((u) => u.id);
    if (ids.length === 0) {
      await db.institution.delete({ where: { id: i.id } });
      continue;
    }
    const depts = await db.department.findMany({
      where: { institutionId: i.id },
      select: { id: true },
    });
    const deptIds = depts.map((d) => d.id);
    const programs = await db.program.findMany({
      where: { departmentId: { in: deptIds } },
      select: { id: true },
    });
    const programIds = programs.map((p) => p.id);
    const batches = await db.batch.findMany({ where: { programId: { in: programIds } }, select: { id: true } });
    const batchIds = batches.map((b) => b.id);
    const sections = await db.section.findMany({
      where: { OR: [{ programId: { in: programIds } }, { batchId: { in: batchIds } }] },
      select: { id: true },
    });
    const sectionIds = sections.map((s) => s.id);
    const offerings = await db.courseOffering.findMany({
      where: { sectionId: { in: sectionIds } },
      select: { id: true },
    });
    const offeringIds = offerings.map((o) => o.id);

    await db.attendanceRecord.deleteMany({ where: { session: { offeringId: { in: offeringIds } } } });
    await db.attendanceSession.deleteMany({ where: { offeringId: { in: offeringIds } } });
    await db.enrollment.deleteMany({ where: { offeringId: { in: offeringIds } } });
    await db.offeringScheduleSlot.deleteMany({ where: { offeringId: { in: offeringIds } } });
    await db.courseOffering.deleteMany({ where: { id: { in: offeringIds } } });
    await db.leaveRequest.deleteMany({ where: { institutionId: i.id } });
    await db.auditLog.deleteMany({ where: { institutionId: i.id } });
    await db.notification.deleteMany({ where: { recipientUserId: { in: ids } } });
    await db.notificationPreference.deleteMany({ where: { userId: { in: ids } } });
    await db.broadcast.deleteMany({ where: { institutionId: i.id } });
    await db.studentProfile.deleteMany({ where: { userId: { in: ids } } });
    await db.staffProfile.deleteMany({ where: { userId: { in: ids } } });
    await db.course.deleteMany({ where: { institutionId: i.id } });
    await db.section.deleteMany({ where: { id: { in: sectionIds } } });
    await db.batch.deleteMany({ where: { id: { in: batchIds } } });
    await db.program.deleteMany({ where: { id: { in: programIds } } });
    await db.academicYear.deleteMany({ where: { institutionId: i.id } });
    await db.department.deleteMany({ where: { id: { in: deptIds } } });
    await db.userRole.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.institution.delete({ where: { id: i.id } });
  }
  console.log(`swept ${insts.length} institutions`);
}

main().finally(() => db.$disconnect());
