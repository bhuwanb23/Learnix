/**
 * Base seed — demo institution + one user per core role.
 * Business-domain data (courses, offerings, fees…) is seeded per role piece later.
 * Login: <email> + Passw0rd!
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

const PASSWORD = 'Passw0rd!';

interface SeedUser {
  email: string;
  fullName: string;
  roles: string[];
  student?: { rollNo: string; section: string; currentSemester: number };
  staff?: { employeeNo: string; designation: string };
}

const USERS: SeedUser[] = [
  { email: 'platform@learnix.dev', fullName: 'Platform Admin', roles: ['PLATFORM_ADMIN'] },
  {
    email: 'admin@learnix.dev',
    fullName: 'Ravi Menon',
    roles: ['ADMIN'],
    staff: { employeeNo: 'EMP-0001', designation: 'Registrar' },
  },
  {
    email: 'teacher@learnix.dev',
    fullName: 'Anita Sharma',
    roles: ['TEACHER'],
    staff: { employeeNo: 'EMP-0002', designation: 'Assistant Professor' },
  },
  {
    email: 'student@learnix.dev',
    fullName: 'Arjun Kumar',
    roles: ['STUDENT'],
    student: { rollNo: 'STU-2026-001', section: 'A', currentSemester: 4 },
  },
];

async function main() {
  console.log('Seeding base data…');

  const institution = await db.institution.upsert({
    where: { code: 'DEMO' },
    update: {},
    create: {
      name: 'Learnix Demo University',
      code: 'DEMO',
      timezone: 'Asia/Kolkata',
      address: '12 Campus Road, Bengaluru',
      plan: 'STANDARD',
      status: 'ACTIVE',
    },
  });
  console.log(`  ✓ institution ${institution.code} (${institution.id})`);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const u of USERS) {
    const existing = await db.user.findFirst({
      where: { email: u.email, institutionId: institution.id },
    });

    if (existing) {
      await db.user.update({
        where: { id: existing.id },
        data: {
          fullName: u.fullName,
          passwordHash,
          status: 'ACTIVE',
          deletedAt: null,
        },
      });
      console.log(`  ✓ ${u.email} (updated)`);
      continue;
    }

    await db.user.create({
      data: {
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        institutionId: institution.id,
        roles: { create: u.roles.map((role) => ({ role })) },
        studentProfile: u.student
          ? {
              create: {
                institutionId: institution.id,
                rollNo: u.student.rollNo,
                section: u.student.section,
                currentSemester: u.student.currentSemester,
                admissionDate: new Date('2024-07-01'),
              },
            }
          : undefined,
        staffProfile: u.staff
          ? {
              create: {
                institutionId: institution.id,
                employeeNo: u.staff.employeeNo,
                designation: u.staff.designation,
                joiningDate: new Date('2023-06-01'),
              },
            }
          : undefined,
      },
    });
    console.log(`  ✓ ${u.email} (${u.roles.join(', ')})`);
  }

  console.log('Base seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
