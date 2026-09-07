import { PrismaClient } from '@prisma/client';
import { notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// A-01 — Dashboard (institution KPIs)
// ─────────────────────────────────────────────────────────────
export async function getDashboard(institutionId: string) {
  const [
    totalStudents,
    totalTeachers,
    totalCourses,
    totalDepartments,
    totalExams,
    totalDrives,
    totalApplications,
    totalOffers,
    totalBooks,
    totalEvents,
    totalAnnouncements,
    pendingApprovals,
  ] = await Promise.all([
    prisma.studentProfile.count({ where: { user: { institutionId, deletedAt: null } } }),
    prisma.staffProfile.count({ where: { institutionId, user: { deletedAt: null } } }),
    prisma.course.count({ where: { institutionId } }),
    prisma.department.count({ where: { institutionId } }),
    prisma.exam.count({ where: { institutionId } }),
    prisma.placementDrive.count({ where: { company: { institutionId } } }),
    prisma.jobApplication.count({ where: { OR: [{ job: { company: { institutionId } } }, { drive: { company: { institutionId } } }] } }),
    prisma.placementOffer.count({ where: { application: { OR: [{ job: { company: { institutionId } } }, { drive: { company: { institutionId } } }] } } }),
    prisma.book.count({ where: { institutionId } }),
    prisma.event.count({ where: { institutionId } }),
    prisma.announcement.count({ where: { institutionId } }),
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
  ]);

  const recentAudit = await prisma.auditLog.findMany({
    where: { institutionId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return {
    hero: { totalStudents, totalTeachers, totalCourses, totalDepartments },
    stats: { totalStudents, totalTeachers, totalCourses, totalExams, totalDrives, totalApplications, totalOffers, totalBooks, totalEvents, totalAnnouncements, pendingApprovals },
    recentActivity: recentAudit.map((a) => ({ id: a.id, action: a.action, entityType: a.entityType, entityId: a.entityId, createdAt: a.createdAt })),
  };
}

// ─────────────────────────────────────────────────────────────
// A-02 — Students list
// ─────────────────────────────────────────────────────────────
export async function listStudents(institutionId: string, departmentId?: string) {
  const where: any = { user: { institutionId, deletedAt: null } };
  if (departmentId) where.program = { departmentId };

  const students = await prisma.studentProfile.findMany({
    where,
    include: { user: { select: { fullName: true, email: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return students.map((s) => ({
    id: s.id, name: s.user.fullName, email: s.user.email, rollNo: s.rollNo,
    section: s.section, currentSemester: s.currentSemester, status: s.user.status,
  }));
}

// ─────────────────────────────────────────────────────────────
// A-03 — Teachers/Staff list + leave requests
// ─────────────────────────────────────────────────────────────
export async function listTeachers(institutionId: string) {
  const teachers = await prisma.staffProfile.findMany({
    where: { institutionId, user: { deletedAt: null } },
    include: { user: { select: { fullName: true, email: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return teachers.map((t) => ({
    id: t.id, name: t.user.fullName, email: t.user.email, employeeNo: t.employeeNo,
    designation: t.designation, departmentId: t.departmentId, status: t.user.status,
  }));
}

export async function listLeaveRequests(_institutionId: string) {
  const requests = await prisma.leaveRequest.findMany({
    include: { staffUser: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return requests.map((r) => ({
    id: r.id, teacherName: r.staffUser.fullName, type: r.type,
    fromDate: r.fromDate, toDate: r.toDate, days: r.days, reason: r.reason, status: r.status,
  }));
}

// ─────────────────────────────────────────────────────────────
// A-04 — Academics & Examinations overview
// ─────────────────────────────────────────────────────────────
export async function getAcademics(institutionId: string) {
  const [exams, evaluations, cheatingCases, conflicts] = await Promise.all([
    prisma.exam.findMany({ where: { institutionId }, orderBy: { createdAt: 'desc' } }),
    prisma.evaluation.findMany({
      where: { examSlot: { exam: { institutionId } } },
      include: { examSlot: { include: { offering: { include: { course: true } } } } },
    }),
    prisma.cheatingCase.findMany({
      where: { examSlot: { exam: { institutionId } } },
      include: { studentProfile: { include: { user: { select: { fullName: true } } } }, examSlot: { include: { offering: { include: { course: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.examConflict.findMany({ where: { exam: { institutionId } } }),
  ]);

  return {
    exams: exams.map((e) => ({ id: e.id, name: e.name, type: e.type, semester: e.semester, status: e.status })),
    evaluations: evaluations.map((ev) => ({ id: ev.id, course: ev.examSlot.offering.course.name, totalPapers: ev.totalPapers, completedPapers: ev.completedPapers, status: ev.status })),
    cheatingCases: cheatingCases.map((c) => ({ id: c.id, student: c.studentProfile.user.fullName, course: c.examSlot.offering.course.name, issue: c.issue, riskLevel: c.riskLevel, status: c.status })),
    conflicts: conflicts.map((c) => ({ id: c.id, type: c.type, description: c.description, severity: c.severity })),
  };
}

// ─────────────────────────────────────────────────────────────
// A-05 — Timetable overview
// ─────────────────────────────────────────────────────────────
export async function getTimetable(institutionId: string) {
  const slots = await prisma.offeringScheduleSlot.findMany({
    where: { offering: { course: { institutionId } } },
    include: { offering: { include: { course: true } } },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  return slots.map((s) => ({
    id: s.id, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime,
    room: s.room, course: s.offering.course.name, courseCode: s.offering.course.code,
  }));
}

// ─────────────────────────────────────────────────────────────
// A-06 — Attendance overview
// ─────────────────────────────────────────────────────────────
export async function getAttendance(institutionId: string) {
  const sessions = await prisma.attendanceSession.findMany({
    where: { offering: { course: { institutionId } } },
    include: { offering: { include: { course: true } }, records: true },
    orderBy: { date: 'desc' },
    take: 20,
  });

  return sessions.map((s) => ({
    id: s.id, date: s.date, course: s.offering.course.name,
    totalStudents: s.records.length,
    present: s.records.filter((r) => r.state === 'PRESENT').length,
    absent: s.records.filter((r) => r.state === 'ABSENT').length,
    late: s.records.filter((r) => r.state === 'LATE').length,
  }));
}

// ─────────────────────────────────────────────────────────────
// A-07 — Assignments overview
// ─────────────────────────────────────────────────────────────
export async function getAssignments(institutionId: string) {
  const assignments = await prisma.assignment.findMany({
    where: { offering: { course: { institutionId } } },
    include: { offering: { include: { course: true } }, submissions: true },
    orderBy: { createdAt: 'desc' },
  });

  return assignments.map((a) => ({
    id: a.id, title: a.title, course: a.offering.course.name,
    dueAt: a.dueAt, status: a.status, maxMarks: a.maxMarks, submissions: a.submissions.length,
  }));
}

// ─────────────────────────────────────────────────────────────
// A-08 — Courses & Departments
// ─────────────────────────────────────────────────────────────
export async function listDepartments(institutionId: string) {
  const departments = await prisma.department.findMany({
    where: { institutionId },
    include: { programs: true },
    orderBy: { createdAt: 'desc' },
  });

  return departments.map((d) => ({
    id: d.id, name: d.name, code: d.code, hodUserId: d.hodUserId, programsCount: d.programs.length,
  }));
}

export async function listCourses(institutionId: string) {
  const courses = await prisma.course.findMany({
    where: { institutionId },
    orderBy: { createdAt: 'desc' },
  });

  return courses.map((c) => ({
    id: c.id, name: c.name, code: c.code, credits: c.credits,
    semester: c.semester, type: c.type, departmentId: c.departmentId,
  }));
}

// ─────────────────────────────────────────────────────────────
// A-09 — Fees overview
// ─────────────────────────────────────────────────────────────
export async function getFees(institutionId: string) {
  const [structures, dues, payments] = await Promise.all([
    prisma.feeStructure.findMany({ where: { institutionId } }),
    prisma.feeDue.findMany({ where: { studentProfile: { user: { institutionId } } }, include: { studentProfile: { include: { user: { select: { fullName: true } } } } }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.payment.findMany({ where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);

  const totalCollected = payments.filter((p) => p.status === 'CLEARED').reduce((a, p) => a + p.amountMinor, 0);
  const totalDues = dues.filter((d) => d.status === 'UNPAID').reduce((a, d) => a + d.amountMinor, 0);

  return {
    totalCollected, totalDues,
    structures: structures.map((s) => ({ id: s.id, totalMinor: s.totalMinor, status: s.status })),
    recentDues: dues.map((d) => ({ id: d.id, student: d.studentProfile.user.fullName, title: d.title, amountMinor: d.amountMinor, status: d.status })),
    recentPayments: payments.map((p) => ({ id: p.id, category: p.category, amountMinor: p.amountMinor, method: p.method, status: p.status })),
  };
}

// ─────────────────────────────────────────────────────────────
// A-10 — Placements overview
// ─────────────────────────────────────────────────────────────
export async function getPlacements(institutionId: string) {
  const companyIds = (await prisma.company.findMany({ where: { institutionId }, select: { id: true } })).map((c) => c.id);

  const [drives, applications, companies] = await Promise.all([
    prisma.placementDrive.findMany({ where: { companyId: { in: companyIds } }, include: { company: true }, orderBy: { createdAt: 'desc' } }),
    prisma.jobApplication.findMany({ where: { OR: [{ job: { companyId: { in: companyIds } } }, { drive: { companyId: { in: companyIds } } }] }, include: { studentProfile: { include: { user: { select: { fullName: true } } } }, job: { include: { company: true } }, drive: { include: { company: true } } }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.company.findMany({ where: { institutionId } }),
  ]);

  return {
    drives: drives.map((d) => ({ id: d.id, title: d.title, company: d.company.name, role: d.role, status: d.status, driveDate: d.driveDate })),
    applications: applications.map((a) => ({ id: a.id, student: a.studentProfile.user.fullName, company: a.job?.company?.name || a.drive?.company?.name || '', role: a.job?.role || a.drive?.role || '', status: a.status })),
    companies: companies.map((c) => ({ id: c.id, name: c.name, sector: c.sector })),
  };
}

// ─────────────────────────────────────────────────────────────
// A-11 — Events overview
// ─────────────────────────────────────────────────────────────
export async function getEvents(institutionId: string) {
  const events = await prisma.event.findMany({
    where: { institutionId },
    include: { registrations: true },
    orderBy: { createdAt: 'desc' },
  });

  return events.map((e) => ({
    id: e.id, title: e.title, category: e.category,
    startDate: e.startDate, endDate: e.endDate, status: e.status,
    registrations: e.registrations.length,
  }));
}

// ─────────────────────────────────────────────────────────────
// A-12 — Library overview
// ─────────────────────────────────────────────────────────────
export async function getLibrary(institutionId: string) {
  const [books, issues, fines] = await Promise.all([
    prisma.book.findMany({ where: { institutionId } }),
    prisma.bookIssue.findMany({ where: { book: { institutionId } }, include: { book: true, studentProfile: { include: { user: { select: { fullName: true } } } } }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.fine.findMany({ where: { bookIssue: { book: { institutionId } } }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);

  const totalBooks = books.reduce((a, b) => a + b.totalCopies, 0);
  const issuedBooks = issues.filter((i) => i.status === 'ISSUED' || i.status === 'OVERDUE').length;
  const overdueIssues = issues.filter((i) => i.status === 'OVERDUE').length;
  const pendingFines = fines.filter((f) => f.status === 'PENDING').reduce((a, f) => a + f.amountMinor, 0);

  return { totalBooks, issuedBooks, overdueIssues, pendingFines };
}

// ─────────────────────────────────────────────────────────────
// A-13 — Hostel/Transport overview
// ─────────────────────────────────────────────────────────────
export async function getHostelTransport(institutionId: string) {
  const [blocks, allocations, routes, vehicles] = await Promise.all([
    prisma.hostelBlock.findMany({ where: { institutionId }, include: { rooms: true } }),
    prisma.hostelAllocation.findMany({ where: { status: 'ACTIVE', bed: { room: { block: { institutionId } } } } }),
    prisma.route.findMany({ where: { institutionId } }),
    prisma.vehicle.findMany({ where: { institutionId } }),
  ]);

  return {
    hostel: { blocks: blocks.length, totalRooms: blocks.reduce((a, b) => a + b.rooms.length, 0), occupied: allocations.length },
    transport: { routes: routes.length, vehicles: vehicles.length },
  };
}

// ─────────────────────────────────────────────────────────────
// A-14 — Announcements
// ─────────────────────────────────────────────────────────────
export async function listAnnouncements(institutionId: string) {
  const announcements = await prisma.announcement.findMany({
    where: { institutionId },
    orderBy: { createdAt: 'desc' },
  });

  return announcements.map((a) => ({
    id: a.id, title: a.title, content: a.content,
    audienceJson: a.audienceJson, status: a.status, createdAt: a.createdAt,
  }));
}

export async function createAnnouncement(institutionId: string, userId: string, body: { title: string; content: string; audience: string }) {
  const announcement = await prisma.announcement.create({
    data: { institutionId, title: body.title, content: body.content, audienceJson: body.audience, authorUserId: userId, status: 'DRAFT' },
  });
  await writeAudit({ institutionId, actorUserId: userId, action: 'ANNOUNCEMENT_CREATED', entityType: 'Announcement', entityId: announcement.id });
  return announcement;
}

export async function decideAnnouncement(institutionId: string, userId: string, announcementId: string, decision: string) {
  const announcement = await prisma.announcement.findFirst({ where: { id: announcementId, institutionId } });
  if (!announcement) throw notFound('Announcement not found');
  const updated = await prisma.announcement.update({ where: { id: announcementId }, data: { status: decision } });
  await writeAudit({ institutionId, actorUserId: userId, action: `ANNOUNCEMENT_${decision}`, entityType: 'Announcement', entityId: announcementId });
  return updated;
}

// ─────────────────────────────────────────────────────────────
// A-15 — Reports
// ─────────────────────────────────────────────────────────────
export async function getReports(institutionId: string) {
  const [totalStudents, totalResults, passCount] = await Promise.all([
    prisma.studentProfile.count({ where: { user: { institutionId, deletedAt: null } } }),
    prisma.result.count({ where: { examSlot: { exam: { institutionId } } } }),
    prisma.result.count({ where: { examSlot: { exam: { institutionId } }, isPass: true } }),
  ]);

  const passRate = totalResults > 0 ? Math.round((passCount / totalResults) * 100) : 0;
  return { totalStudents, totalResults, passRate };
}

// ─────────────────────────────────────────────────────────────
// A-16 — Settings
// ─────────────────────────────────────────────────────────────
export async function getSettings(institutionId: string) {
  const [academicYears, configs, featureFlags] = await Promise.all([
    prisma.academicYear.findMany({ where: { institutionId }, orderBy: { createdAt: 'desc' } }),
    prisma.systemConfig.findMany({ where: { institutionId } }),
    prisma.featureFlag.findMany({ where: { institutionId } }),
  ]);

  return {
    academicYears: academicYears.map((ay) => ({ id: ay.id, name: ay.name, isCurrent: ay.isCurrent })),
    configs: configs.map((c) => ({ id: c.id, key: c.key, value: c.valueJson })),
    featureFlags: featureFlags.map((f) => ({ id: f.id, key: f.key, enabled: f.enabled })),
  };
}

// ─────────────────────────────────────────────────────────────
// A-17 — Notifications + audit logs
// ─────────────────────────────────────────────────────────────
export async function listNotifications(userId: string, institutionId: string) {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { recipientUserId: userId, institutionId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.notification.count({ where: { recipientUserId: userId, institutionId, readAt: null } }),
  ]);
  return {
    unread,
    notifications: items.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, read: n.readAt !== null, createdAt: n.createdAt })),
  };
}

export async function markAllRead(userId: string, institutionId: string) {
  const res = await prisma.notification.updateMany({ where: { recipientUserId: userId, institutionId, readAt: null }, data: { readAt: new Date() } });
  return { updated: res.count };
}

export async function listAuditLogs(institutionId: string) {
  const logs = await prisma.auditLog.findMany({
    where: { institutionId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return logs.map((l) => ({
    id: l.id, action: l.action, entityType: l.entityType, entityId: l.entityId,
    actorUserId: l.actorUserId, createdAt: l.createdAt,
  }));
}

export async function createBroadcast(institutionId: string, _senderUserId: string, body: { audience: string; title: string; body: string }) {
  let recipientIds: string[] = [];

  if (body.audience === 'ALL_STUDENTS') {
    const students = await prisma.studentProfile.findMany({ where: { user: { institutionId, deletedAt: null } }, select: { userId: true } });
    recipientIds = students.map((s) => s.userId);
  } else if (body.audience === 'ALL_STAFF') {
    const staff = await prisma.staffProfile.findMany({ where: { institutionId, user: { deletedAt: null } }, select: { userId: true } });
    recipientIds = staff.map((s) => s.userId);
  } else if (body.audience === 'ALL_USERS') {
    const users = await prisma.user.findMany({ where: { institutionId, deletedAt: null }, select: { id: true } });
    recipientIds = users.map((u) => u.id);
  }

  if (recipientIds.length === 0) return { created: 0 };

  await prisma.notification.createMany({
    data: recipientIds.map((id) => ({ recipientUserId: id, institutionId, type: 'ADMIN_BROADCAST', title: body.title, body: body.body })),
  });
  return { created: recipientIds.length };
}
