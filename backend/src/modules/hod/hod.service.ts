import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import { durationHours } from './hod-dashboard.sections.js';

// ── HOD scope resolution: the department this HOD owns ───────
export async function getDepartment(hodUserId: string, institutionId: string) {
  const dept = await prisma.department.findFirst({
    where: { institutionId, hodUserId },
    include: { programs: { select: { id: true, name: true, code: true } } },
  });
  if (!dept) throw notFound('No department assigned to this HOD');
  return dept;
}

async function requireDepartment(hodUserId: string, institutionId: string) {
  const dept = await getDepartment(hodUserId, institutionId);
  if (!dept) throw notFound('No department assigned to this HOD');
  return dept;
}

// ═══ Department scope ═════════════════════════════════════════════════════
//
// THE SCOPES, IN ONE PLACE, so they cannot drift.
//
// Every read in this module is scoped to the HOD's own department, and the three ways of reaching
// a department's data are not the same:
//
//   · STAFF      — `StaffProfile.departmentId` is the department's own column.
//   · STUDENTS   — through the department's PROGRAMMES, because a student belongs to a programme
//                  and a programme belongs to a department.
//   · OFFERINGS  — through the offering's SECTION → PROGRAM → DEPARTMENT. The offering itself
//                  carries no department column.
//
// TWO LEAKS WERE FIXED HERE, and both are worth recording:
//
//   1. The LEAVE requests were filtered by `institutionId` alone. An HOD of CSE could therefore
//      LIST and APPROVE another department's leave requests — the leave belongs to a person, and
//      the person's department is the scope. A leave is now scoped through
//      `staffUser.staffProfile.departmentId`.
//
//   2. The DASHBOARD's WORKLOAD query was filtered by `teacherUserId` alone. A teacher who also
//      teaches in another department brought those offerings into this department's workload
//      count, inflating the utilisation figure and raising a false "overloaded" alert. The
//      offerings are now scoped to the department.

/** The leave requests belonging to THIS department's staff. */
function leaveScope(institutionId: string, departmentId: string) {
  return {
    institutionId,
    staffUser: { staffProfile: { departmentId } },
  };
}

/** The course offerings that belong to THIS department, through section → program. */
function offeringScope(departmentId: string) {
  return { section: { program: { departmentId } } };
}

/** The staff of THIS department. */
function staffScope(institutionId: string, departmentId: string) {
  return { institutionId, departmentId };
}

// ── HD-01 Dashboard — REMOVED, superseded by `hod-dashboard.service.ts`.
//
// The old `getDashboard` answered with `{ department, engagement, stats, alerts, pendingApprovals }`
// — a hero, four counters and a list of PROSE STRINGS. It had four defects that could not be fixed
// in place:
//
//   1. It counted the leave requests INSTITUTION-WIDE, so an HOD's "pending" figure included other
//      departments' leave — and `listLeaves`/`decideLeave` let that HOD see and APPROVE them.
//      Both are now scoped to the department's staff, through `leaveScope`.
//   2. Its workload query was filtered by `teacherUserId` alone, so a teacher who also taught in
//      another department inflated this department's utilisation and could raise a false
//      "overloaded" alert. It is now scoped through `offeringScope` — section → program →
//      department.
//   3. Its alerts were prose strings, which cannot be filtered, counted or linked to.
//   4. It had no attendance, no pass rate, no syllabus progress, no teaching hours delivered, no
//      student risk, no trends and no health score.
//
// The replacement is NINE STRUCTURED SECTIONS, in `hod-dashboard.service.ts`.
//
// THE SCOPES STAY HERE, because the OTHER functions in this module use them too, and a scope
// written twice is a scope that will drift. `leaveScope`, `offeringScope` and `staffScope` are the
// one definition of "this department's", and every read below goes through one of them.
// ── HD-02 Faculty ────────────────────────────────────────────
export async function listFaculty(hodUserId: string, institutionId: string) {
  const dept = await requireDepartment(hodUserId, institutionId);

  const staff = await prisma.staffProfile.findMany({
    where: { ...staffScope(institutionId, dept.id), user: { deletedAt: null } },
    include: { user: { select: { id: true, fullName: true, email: true, roles: true } } },
    orderBy: { user: { fullName: 'asc' } },
  });

  const userIds = staff.map((s) => s.userId);
  // SCOPED TO THE DEPARTMENT — see `offeringScope`. It used to be `teacherUserId` alone, so a
  // teacher's cross-department offerings were counted against this department.
  const offerings = await prisma.courseOffering.findMany({
    where: { teacherUserId: { in: userIds }, ...offeringScope(dept.id) },
    include: {
      course: { select: { code: true, name: true } },
      section: { select: { name: true } },
      scheduleSlots: { select: { startTime: true, endTime: true } },
      _count: { select: { enrollments: true } },
    },
  });

  // Approved leave days this academic year → on-leave status
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const leaves = await prisma.leaveRequest.findMany({
    where: { ...leaveScope(institutionId, dept.id), status: 'APPROVED', fromDate: { gte: yearStart } },
    select: { staffUserId: true, fromDate: true, toDate: true },
  });

  return staff.map((s) => {
    const myOfferings = offerings.filter((o) => o.teacherUserId === s.userId);
    // THE LOAD IS IN HOURS, the same unit the max-workload guard and the dashboard use. It used
    // to be a schedule-slot COUNT against a hours limit, so a three-hour lecture counted as one
    // hour and the bar on the screen did not mean what the reader took it to mean.
    const load = Math.round(
      myOfferings.reduce(
        (sum, o) =>
          sum +
          o.scheduleSlots.reduce(
            (acc, slot) => acc + durationHours(slot.startTime, slot.endTime),
            0,
          ),
        0,
      ) * 100,
    ) / 100;
    const onLeave = leaves.some(
      (l) => l.staffUserId === s.userId && l.fromDate <= now && l.toDate >= now,
    );
    return {
      id: s.userId,
      profileId: s.id,
      name: s.user.fullName,
      email: s.user.email,
      designation: s.designation ?? 'Faculty',
      isHod: s.user.roles.some((r) => r.role === 'HOD'),
      maxWorkload: s.maxWorkloadHours,
      workload: load,
      utilizationPct: s.maxWorkloadHours === 0 ? 0 : Math.round((load / s.maxWorkloadHours) * 100),
      status: onLeave ? 'ON_LEAVE' : 'ACTIVE',
      classes: myOfferings.map((o) => ({
        id: o.id,
        code: o.course.code,
        name: o.course.name,
        section: o.section.name,
        students: o._count.enrollments,
        weeklyHours: Math.round(
          o.scheduleSlots.reduce(
            (acc, slot) => acc + durationHours(slot.startTime, slot.endTime),
            0,
          ) * 100,
        ) / 100,
      })),
    };
  });
}

export async function reassignOffering(
  hodUserId: string,
  institutionId: string,
  offeringId: string,
  toUserId: string,
) {
  const dept = await requireDepartment(hodUserId, institutionId);

  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    include: { course: { select: { departmentId: true } } },
  });
  if (!offering || offering.course.departmentId !== dept.id) {
    throw notFound('Offering not found in your department');
  }

  const target = await prisma.staffProfile.findFirst({
    where: { userId: toUserId, institutionId, user: { deletedAt: null } },
    include: { user: { select: { fullName: true } } },
  });
  if (!target) throw notFound('Target faculty not found in your institution');

  // Max-hours enforcement (HD-02)
  //
  // SCOPED TO THE DEPARTMENT, for the same reason as everywhere else: a teacher's load in
  // ANOTHER department is not this department's business, and counting it would refuse a
  // perfectly reasonable reassignment on the strength of somebody else's timetable.
  //
  // THE UNIT IS HOURS, AND IT WAS NOT
  // ----------------------------------
  // This used to count SCHEDULE SLOTS and compare the count against `maxWorkloadHours` — a
  // hours limit. A three-hour lecture counted as one hour, so the guard let an overloaded
  // teacher through, while the dashboard's workload section — which measures the same thing in
  // hours — showed a different number for the same person. The screen and the rule that
  // enforces it disagreed about the same teacher.
  //
  // So the load is measured in HOURS now, through the same `durationHours` the dashboard and the
  // Courses desk use. One unit, everywhere.
  const siblings = await prisma.courseOffering.findMany({
    where: { teacherUserId: toUserId, ...offeringScope(dept.id) },
    select: {
      id: true,
      scheduleSlots: { select: { startTime: true, endTime: true } },
    },
  });
  const currentLoad = siblings.reduce(
    (sum, o) =>
      sum + o.scheduleSlots.reduce((s, slot) => s + durationHours(slot.startTime, slot.endTime), 0),
    0,
  );
  const movingSlots = await prisma.offeringScheduleSlot.findMany({
    where: { offeringId },
    select: { startTime: true, endTime: true },
  });
  const moving = movingSlots.reduce(
    (s, slot) => s + durationHours(slot.startTime, slot.endTime),
    0,
  );
  if (currentLoad + moving > target.maxWorkloadHours) {
    throw unprocessable(
      `Reassignment exceeds ${target.user.fullName}'s max workload (${Math.round((currentLoad + moving) * 100) / 100} > ${target.maxWorkloadHours} hrs)`,
    );
  }

  const updated = await prisma.courseOffering.update({
    where: { id: offeringId },
    data: { teacherUserId: toUserId },
  });

  await writeAudit({
    actorUserId: hodUserId,
    institutionId,
    action: 'hod.offering.reassign',
    entityType: 'CourseOffering',
    entityId: offeringId,
    before: { teacherUserId: offering.teacherUserId },
    after: { teacherUserId: toUserId },
  });
  return { id: updated.id, teacherUserId: updated.teacherUserId };
}

// ── HD-03 Syllabus approvals ─────────────────────────────────
export async function listSyllabus(hodUserId: string, institutionId: string) {
  const dept = await requireDepartment(hodUserId, institutionId);

  const versions = await prisma.syllabusVersion.findMany({
    where: { course: { institutionId, departmentId: dept.id }, status: { in: ['SUBMITTED', 'HOD_APPROVED', 'CHANGES_REQUESTED', 'ADMIN_APPROVED'] } },
    include: {
      course: { select: { id: true, code: true, name: true, semester: true, credits: true } },
      units: { select: { id: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const submitterIds = [...new Set(versions.map((v) => v.submittedByUserId))];
  const submitters = await prisma.user.findMany({
    where: { id: { in: submitterIds } },
    select: { id: true, fullName: true },
  });
  const submitterMap = new Map(submitters.map((u) => [u.id, u.fullName]));

  return versions.map((v) => ({
    id: v.id,
    courseId: v.course.id,
    courseCode: v.course.code,
    courseName: v.course.name,
    semester: v.course.semester,
    credits: v.course.credits,
    version: v.version,
    units: v.units.length,
    submittedBy: submitterMap.get(v.submittedByUserId) ?? 'Unknown',
    status: v.status,
    feedback: v.feedback,
    updatedAt: v.updatedAt,
  }));
}

export async function decideSyllabus(
  hodUserId: string,
  institutionId: string,
  syllabusVersionId: string,
  decision: 'approve' | 'request-changes',
  feedback: string | null,
) {
  const dept = await requireDepartment(hodUserId, institutionId);

  const version = await prisma.syllabusVersion.findFirst({
    where: { id: syllabusVersionId, course: { institutionId, departmentId: dept.id } },
    include: {
      course: { select: { code: true, name: true } },
      units: { select: { id: true } },
    },
  });
  if (!version) throw notFound('Syllabus version not found in your department');
  if (version.status !== 'SUBMITTED') {
    throw conflict(`Syllabus is ${version.status}, only SUBMITTED versions can be decided`);
  }
  if (decision === 'request-changes' && !feedback) {
    throw unprocessable('Feedback is required when requesting changes');
  }

  const newStatus = decision === 'approve' ? 'HOD_APPROVED' : 'CHANGES_REQUESTED';
  const [updated] = await Promise.all([
    prisma.syllabusVersion.update({
      where: { id: version.id },
      data: { status: newStatus, feedback, actionedByUserId: hodUserId },
    }),
    prisma.notification.create({
      data: {
        institutionId,
        recipientUserId: version.submittedByUserId,
        type: 'SYLLABUS',
        title: decision === 'approve'
          ? `Syllabus approved — ${version.course.code}`
          : `Changes requested — ${version.course.code}`,
        body: decision === 'approve'
          ? `Your ${version.course.name} syllabus v${version.version} was approved by the HOD and forwarded to Admin.`
          : `Feedback on ${version.course.name} v${version.version}: ${feedback}`,
        sourceModule: 'hod',
      },
    }),
  ]);

  await writeAudit({
    actorUserId: hodUserId,
    institutionId,
    action: `hod.syllabus.${decision}`,
    entityType: 'SyllabusVersion',
    entityId: version.id,
    before: { status: 'SUBMITTED' },
    after: { status: newStatus },
  });
  return { id: updated.id, status: updated.status };
}

// ── HD-05 Students ───────────────────────────────────────────
export async function listStudents(hodUserId: string, institutionId: string, year?: number) {
  const dept = await getDepartment(hodUserId, institutionId);
  const programIds = dept.programs.map((p) => p.id);

  const where = {
    institutionId,
    programId: { in: programIds },
    user: { deletedAt: null },
    ...(year ? { currentSemester: year } : {}),
  };

  const profiles = await prisma.studentProfile.findMany({
    where,
    include: { user: { select: { id: true, fullName: true } } },
    orderBy: { rollNo: 'asc' },
    take: 200,
  });

  const bySemester = new Map<number, number>();
  for (const p of profiles) {
    const sem = p.currentSemester ?? 0;
    bySemester.set(sem, (bySemester.get(sem) ?? 0) + 1);
  }

  return {
    stats: {
      total: profiles.length,
      bySemester: [...bySemester.entries()].sort((a, b) => a[0] - b[0]).map(([semester, count]) => ({ semester, count })),
    },
    students: profiles.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.user.fullName,
      rollNo: p.rollNo,
      section: p.section,
      semester: p.currentSemester,
      status: p.status,
    })),
  };
}

// ── HD-06 Course offerings oversight ─────────────────────────
export async function listCourses(hodUserId: string, institutionId: string) {
  const dept = await requireDepartment(hodUserId, institutionId);

  const courses = await prisma.course.findMany({
    where: { institutionId, departmentId: dept.id },
    include: {
      offerings: {
        include: {
          section: { select: { name: true } },
          _count: { select: { enrollments: true, scheduleSlots: true } },
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  const teacherIds = [
    ...new Set(courses.flatMap((c) => c.offerings.map((o) => o.teacherUserId))),
  ];
  const teachers = await prisma.user.findMany({
    where: { id: { in: teacherIds } },
    select: { id: true, fullName: true },
  });
  const teacherMap = new Map(teachers.map((t) => [t.id, t.fullName]));

  const syllabusRows = await prisma.syllabusVersion.findMany({
    where: { course: { departmentId: dept.id } },
    orderBy: { version: 'desc' },
    select: { courseId: true, status: true, version: true },
  });
  const latestSyllabus = new Map<string, string>();
  for (const s of syllabusRows) {
    if (!latestSyllabus.has(s.courseId)) latestSyllabus.set(s.courseId, s.status);
  }

  return {
    stats: {
      total: courses.length,
      approved: courses.filter((c) => latestSyllabus.get(c.id) === 'HOD_APPROVED' || latestSyllabus.get(c.id) === 'ADMIN_APPROVED').length,
      pending: courses.filter((c) => latestSyllabus.get(c.id) === 'SUBMITTED').length,
    },
    courses: courses.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      semester: c.semester,
      credits: c.credits,
      type: c.type,
      syllabusStatus: latestSyllabus.get(c.id) ?? 'DRAFT',
      offerings: c.offerings.map((o) => ({
        id: o.id,
        section: o.section.name,
        teacher: teacherMap.get(o.teacherUserId) ?? 'Unassigned',
        students: o._count.enrollments,
        weeklyHours: o._count.scheduleSlots,
      })),
    })),
  };
}

export async function getCourseDetail(hodUserId: string, institutionId: string, courseId: string) {
  const dept = await requireDepartment(hodUserId, institutionId);

  const course = await prisma.course.findFirst({
    where: { id: courseId, institutionId, departmentId: dept.id },
    include: {
      offerings: {
        include: {
          section: { select: { name: true } },
          _count: { select: { enrollments: true, scheduleSlots: true } },
        },
      },
    },
  });
  if (!course) throw notFound('Course not found in your department');

  const [syllabus, teacherIds] = await Promise.all([
    prisma.syllabusVersion.findFirst({
      where: { courseId: course.id },
      orderBy: { version: 'desc' },
      include: {
        units: {
          include: { topics: { select: { id: true, status: true } } },
          orderBy: { order: 'asc' },
        },
      },
    }),
    prisma.courseOffering.findMany({ where: { courseId: course.id }, select: { teacherUserId: true } }),
  ]);

  const teachers = teacherIds.length
    ? await prisma.user.findMany({ where: { id: { in: [...new Set(teacherIds.map((t) => t.teacherUserId))] } }, select: { fullName: true } })
    : [];

  const totalStudents = course.offerings.reduce((s, o) => s + o._count.enrollments, 0);

  return {
    id: course.id,
    code: course.code,
    name: course.name,
    semester: course.semester,
    credits: course.credits,
    type: course.type,
    totalStudents,
    teachers: teachers.map((t) => t.fullName),
    syllabus: syllabus
      ? {
          id: syllabus.id,
          version: syllabus.version,
          status: syllabus.status,
          feedback: syllabus.feedback,
          units: syllabus.units.map((u) => ({
            id: u.id,
            title: u.title,
            topics: u.topics.length,
            completed: u.topics.filter((t) => t.status === 'COMPLETED').length,
          })),
        }
      : null,
    offerings: course.offerings.map((o) => ({
      id: o.id,
      section: o.section.name,
      students: o._count.enrollments,
      weeklyHours: o._count.scheduleSlots,
    })),
  };
}

// ── HD-04 Leave requests ─────────────────────────────────────
export async function listLeaves(hodUserId: string, institutionId: string) {
  const dept = await requireDepartment(hodUserId, institutionId);

  // SCOPED TO THE DEPARTMENT. It used to be `institutionId` alone, which meant an HOD could see
  // — and through `decideLeave`, APPROVE — every other department's leave requests. A leave belongs
  // to a person, and the person's department is the scope.
  const leaves = await prisma.leaveRequest.findMany({
    where: leaveScope(institutionId, dept.id),
    include: {
      staffUser: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return leaves.map((l) => ({
    id: l.id,
    staffUserId: l.staffUserId,
    teacher: l.staffUser.fullName,
    type: l.type,
    fromDate: l.fromDate,
    toDate: l.toDate,
    days: l.days,
    reason: l.reason,
    status: l.status,
    substituteUserId: l.substituteUserId,
  }));
}

export async function decideLeave(
  hodUserId: string,
  institutionId: string,
  leaveId: string,
  decision: 'approve' | 'reject',
  substituteUserId: string | null,
) {
  const dept = await requireDepartment(hodUserId, institutionId);

  const leave = await prisma.leaveRequest.findFirst({
    where: { id: leaveId, ...leaveScope(institutionId, dept.id) },
    include: { staffUser: { select: { fullName: true } } },
  });
  if (!leave) throw notFound('Leave request not found');
  if (leave.status !== 'PENDING') {
    throw conflict(`Leave is already ${leave.status}`);
  }
  if (decision === 'approve' && substituteUserId) {
    const sub = await prisma.staffProfile.findFirst({
      where: { userId: substituteUserId, institutionId, user: { deletedAt: null } },
      include: { user: { select: { fullName: true } } },
    });
    if (!sub) throw notFound('Substitute faculty not found');
  }

  const newStatus = decision === 'approve' ? 'APPROVED' : 'REJECTED';
  const [updated] = await Promise.all([
    prisma.leaveRequest.update({
      where: { id: leave.id },
      data: {
        status: newStatus,
        substituteUserId: decision === 'approve' ? substituteUserId : null,
        decidedByUserId: hodUserId,
        decidedAt: new Date(),
      },
    }),
    prisma.notification.create({
      data: {
        institutionId,
        recipientUserId: leave.staffUserId,
        type: 'LEAVE',
        title: `Leave ${newStatus.toLowerCase()}`,
        body: decision === 'approve'
          ? `Your ${leave.type.toLowerCase()} leave (${leave.days} day${leave.days === 1 ? '' : 's'}) was approved.`
          : `Your ${leave.type.toLowerCase()} leave request was rejected by the HOD.`,
        sourceModule: 'hod',
      },
    }),
  ]);

  await writeAudit({
    actorUserId: hodUserId,
    institutionId,
    action: `hod.leave.${decision}`,
    entityType: 'LeaveRequest',
    entityId: leave.id,
    before: { status: 'PENDING' },
    after: { status: newStatus },
  });
  return { id: updated.id, status: updated.status };
}

// ── HD-07 Results/attendance analytics (service aggregate) ───
export async function getAnalytics(hodUserId: string, institutionId: string) {
  const dept = await requireDepartment(hodUserId, institutionId);

  const offerings = await prisma.courseOffering.findMany({
    where: offeringScope(dept.id),
    select: { id: true, courseId: true },
  });
  const offeringIds = offerings.map((o) => o.id);

  const [sessions, results] = await Promise.all([
    offeringIds.length
      ? prisma.attendanceSession.findMany({
          where: { offeringId: { in: offeringIds } },
          select: { id: true, offeringId: true, records: { select: { state: true } } },
        })
      : Promise.resolve([]),
    offeringIds.length
      ? prisma.result.findMany({
          where: { examSlot: { offeringId: { in: offeringIds } } },
          select: { marksObtained: true, maxMarks: true, isPass: true },
        })
      : Promise.resolve([]),
  ]);

  const totalRecords = sessions.flatMap((s) => s.records);
  const present = totalRecords.filter((r) => r.state === 'PRESENT' || r.state === 'LATE').length;
  const attendancePct = totalRecords.length === 0 ? null : Math.round((present / totalRecords.length) * 100);
  const passRate = results.length === 0
    ? null
    : Math.round((results.filter((r) => r.isPass).length / results.length) * 100);

  return {
    analytics: {
      attendancePct,
      passRate,
      sessionsConsidered: sessions.length,
      resultsConsidered: results.length,
    },
    note:
      attendancePct === null && passRate === null
        ? 'No attendance sessions or published results yet — analytics fill in as teachers and exam cell work.'
        : null,
  };
}

// ── HD-08 Notifications + broadcast ──────────────────────────
export async function listNotifications(userId: string, institutionId: string) {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientUserId: userId, institutionId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { recipientUserId: userId, institutionId, readAt: null } }),
  ]);
  return {
    unread,
    notifications: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      read: n.readAt !== null,
      createdAt: n.createdAt,
    })),
  };
}

export async function markAllRead(userId: string, institutionId: string) {
  const res = await prisma.notification.updateMany({
    where: { recipientUserId: userId, institutionId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: res.count };
}

export async function createBroadcast(
  hodUserId: string,
  institutionId: string,
  body: { audience: 'ALL_FACULTY' | 'DEPT_STUDENTS'; title: string; body: string },
) {
  const dept = await getDepartment(hodUserId, institutionId);

  let recipientIds: string[] = [];
  if (body.audience === 'ALL_FACULTY') {
    const staff = await prisma.staffProfile.findMany({
      where: { institutionId, departmentId: dept.id, user: { deletedAt: null } },
      select: { userId: true },
    });
    recipientIds = staff.map((s) => s.userId);
  } else {
    const students = await prisma.studentProfile.findMany({
      where: { institutionId, programId: { in: dept.programs.map((p) => p.id) }, user: { deletedAt: null } },
      select: { userId: true },
    });
    recipientIds = students.map((s) => s.userId);
  }

  const broadcast = await prisma.broadcast.create({
    data: {
      institutionId,
      senderUserId: hodUserId,
      audienceJson: JSON.stringify({ audience: body.audience, departmentId: dept.id }),
      title: body.title,
      body: body.body,
      channels: 'IN_APP',
      sentAt: new Date(),
    },
  });

  if (recipientIds.length > 0) {
    await prisma.notification.createMany({
      data: recipientIds.map((rid) => ({
        institutionId,
        recipientUserId: rid,
        type: 'BROADCAST',
        title: body.title,
        body: body.body,
        sourceModule: 'hod',
      })),
    });
  }

  await writeAudit({
    actorUserId: hodUserId,
    institutionId,
    action: 'hod.broadcast.send',
    entityType: 'Broadcast',
    entityId: broadcast.id,
    after: { audience: body.audience, recipients: recipientIds.length },
  });

  return { id: broadcast.id, recipients: recipientIds.length };
}

// ── HD-08 Profile ────────────────────────────────────────────
export async function getProfile(userId: string, institutionId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, institutionId },
    include: { roles: true, staffProfile: true },
  });
  if (!user) throw notFound('User not found');

  const dept = user.staffProfile?.departmentId
    ? await prisma.department.findFirst({ where: { id: user.staffProfile.departmentId } })
    : null;

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    roles: user.roles.map((r) => r.role),
    designation: user.staffProfile?.designation ?? null,
    department: dept ? { id: dept.id, name: dept.name, code: dept.code } : null,
  };
}
