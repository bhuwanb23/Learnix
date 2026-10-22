import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const insts = await db.institution.findMany({
    where: { name: { contains: 'HOD Faculty Check' } },
    orderBy: { createdAt: 'desc' },
    take: 2,
    select: { id: true, name: true },
  });
  for (const i of insts) {
    const users = await db.user.findMany({ where: { institutionId: i.id }, select: { id: true, email: true } });
    for (const u of users) {
      console.log(`INST ${i.name} USER ${u.email} ${u.id}`);
      const tables: [string, any][] = [
        ['user_roles', await db.userRole.count({ where: { userId: u.id } })],
        ['leave_requests', await db.leaveRequest.count({ where: { staffUserId: u.id } })],
        ['notifications', await db.notification.count({ where: { recipientUserId: u.id } })],
        ['staff_profiles', await db.staffProfile.count({ where: { userId: u.id } })],
        ['student_profiles', await db.studentProfile.count({ where: { userId: u.id } })],
        ['audit_logs', await db.auditLog.count({ where: { actorUserId: u.id } })],
        ['course_offerings', await db.courseOffering.count({ where: { teacherUserId: u.id } })],
        ['enrollments', await db.enrollment.count({ where: { studentProfile: { userId: u.id } } })],
        ['broadcasts', await db.broadcast.count({ where: { createdByUserId: u.id } })],
        ['platform_admins', await db.platformAdmin.count({ where: { userId: u.id } })],
        ['notification_prefs', await db.notificationPreference.count({ where: { userId: u.id } })],
        ['sessions', await db.session.count({ where: { userId: u.id } })],
      ];
      for (const [t, n] of tables) if (n > 0) console.log(`   ${t} = ${n}`);
    }
  }
}

main().finally(() => db.$disconnect());
