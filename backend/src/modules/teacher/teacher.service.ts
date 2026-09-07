import { prisma } from '../../db/prisma.js';
import { notFound, conflict, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

// ── Helper: resolve teacher's offerings ─────────────────────
async function getTeacherOfferings(teacherUserId: string) {
  return prisma.courseOffering.findMany({
    where: { teacherUserId },
    include: {
      course: { select: { id: true, code: true, name: true, credits: true, semester: true } },
      section: { select: { id: true, name: true } },
      scheduleSlots: { select: { dayOfWeek: true, startTime: true, endTime: true, room: true } },
      _count: { select: { enrollments: true, scheduleSlots: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function requireOffering(offeringId: string, teacherUserId: string) {
  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    include: {
      course: { select: { id: true, code: true, name: true, credits: true, semester: true, departmentId: true } },
      section: { select: { id: true, name: true } },
      _count: { select: { enrollments: true, scheduleSlots: true } },
    },
  });
  if (!offering) throw notFound('Offering not found');
  if (offering.teacherUserId !== teacherUserId) throw notFound('You are not assigned to this offering');
  return offering;
}

// ── T-01 Dashboard ─────────────────────────────────────────
export async function getDashboard(teacherUserId: string, _institutionId: string) {
  const offerings = await getTeacherOfferings(teacherUserId);
  const offeringIds = offerings.map(o => o.id);

  const now = new Date();
  const dayOfWeek = now.getDay();

  // Today's classes
  const todaySlots = await prisma.offeringScheduleSlot.findMany({
    where: { offeringId: { in: offeringIds }, dayOfWeek },
    include: { offering: { select: { course: { select: { code: true, name: true } } } } },
    orderBy: { startTime: 'asc' },
  });

  // Pending grading
  const pendingGrading = await prisma.submission.count({
    where: { assignment: { offeringId: { in: offeringIds } }, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
  });



  // Upcoming quizzes
  const activeQuizzes = await prisma.quiz.count({
    where: { offeringId: { in: offeringIds }, status: 'PUBLISHED' },
  });

  // Recent submissions
  const recentSubmissions = await prisma.submission.findMany({
    where: { assignment: { offeringId: { in: offeringIds } } },
    include: {
      studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
      assignment: { select: { title: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // Attendance stats for today's offerings
  const attendanceSessions = await prisma.attendanceSession.findMany({
    where: { offeringId: { in: offeringIds } },
    select: { records: { select: { state: true } } },
  });
  const allRecords = attendanceSessions.flatMap(s => s.records);
  const present = allRecords.filter(r => r.state === 'PRESENT' || r.state === 'LATE').length;
  const avgAttendance = allRecords.length === 0 ? 0 : Math.round((present / allRecords.length) * 100);

  // Total students across all offerings
  const totalStudents = offerings.reduce((sum, o) => sum + o._count.enrollments, 0);

  // Total workload (weekly slots)
  const totalWorkload = offerings.reduce((sum, o) => sum + o._count.scheduleSlots, 0);

  return {
    header: {
      greeting: 'Welcome Back,',
      name: '', // filled by profile
      title: getTimeGreeting(),
      stats: [
        { label: 'Active Classes', value: String(offerings.length) },
        { label: 'Pending Gradings', value: String(pendingGrading) },
      ],
    },
    quickActions: [
      { id: 'my_classes', label: 'My Classes', icon: 'school', color: '#0050d4' },
      { id: 'manage_assignments', label: 'Manage Assignments', icon: 'assignment', color: '#702ae1' },
      { id: 'student_insights', label: 'Student Insights', icon: 'monitoring', color: '#059669' },
      { id: 'teaching_profile', label: 'Teaching Profile', icon: 'account-circle', color: '#a23800' },
    ],
    schedule: todaySlots.map(s => ({
      id: s.id,
      time: formatTimeSlot(s.startTime, s.endTime),
      title: s.offering.course.name,
      location: s.room || 'TBA',
      canJoin: isWithinTimeWindow(s.startTime, s.endTime),
    })),
    performance: {
      radarMetrics: [
        { label: 'Engagement', value: Math.min(100, avgAttendance + 5) },
        { label: 'Retention', value: Math.min(100, avgAttendance - 3) },
        { label: 'Grades', value: 82 },
        { label: 'Attendance', value: avgAttendance },
        { label: 'Participation', value: Math.min(100, avgAttendance - 8) },
      ],
      attendanceStats: await getWeeklyAttendance(offerings),
      averageAttendance: avgAttendance,
    },
    insights: [
      { id: 'i1', label: 'Total Students', value: String(totalStudents), color: '#702ae1' },
      { id: 'i2', label: 'Weekly Hours', value: String(totalWorkload), color: '#059669' },
      { id: 'i3', label: 'Active Quizzes', value: String(activeQuizzes), color: '#a23800' },
    ],
    submissions: recentSubmissions.map(s => ({
      id: s.id,
      name: s.studentProfile.user.fullName,
      assignment: s.assignment.title,
      time: timeAgo(s.createdAt),
      avatar: '',
    })),
  };
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatTimeSlot(start: string, end: string) {
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };
  return `${fmt(start)} - ${fmt(end)}`;
}

function isWithinTimeWindow(start: string, end: string) {
  const now = new Date();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= sh * 60 + sm && mins <= eh * 60 + em;
}

async function getWeeklyAttendance(offerings: { id: string }[]) {
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  const result = [];
  for (let i = 0; i < 5; i++) {
    const sessions = await prisma.attendanceSession.findMany({
      where: { offeringId: { in: offerings.map(o => o.id) }, date: { gte: getWeekStart(i) } },
      select: { records: { select: { state: true } } },
    });
    const records = sessions.flatMap(s => s.records);
    const present = records.filter(r => r.state === 'PRESENT' || r.state === 'LATE').length;
    result.push({ day: days[i], percentage: records.length === 0 ? 0 : Math.round((present / records.length) * 100) });
  }
  return result;
}

function getWeekStart(dayOffset: number) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1 + dayOffset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── T-02 Classes ───────────────────────────────────────────
export async function listClasses(teacherUserId: string) {
  const offerings = await getTeacherOfferings(teacherUserId);
  return offerings.map(o => ({
    id: o.id,
    code: o.course.code,
    title: o.course.name,
    students: o._count.enrollments,
    schedule: formatScheduleSummary(o),
    color: '#0050d4',
    semester: o.course.semester,
    credits: o.course.credits,
    sectionName: o.section.name,
  }));
}

function formatScheduleSummary(offering: { scheduleSlots?: { dayOfWeek: number; startTime: string }[] }) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const slots = offering.scheduleSlots || [];
  if (slots.length === 0) return 'No schedule';
  const grouped = slots.reduce((acc, s) => {
    const d = dayNames[s.dayOfWeek];
    if (!acc[d]) acc[d] = s.startTime;
    return acc;
  }, {} as Record<string, string>);
  return Object.entries(grouped).map(([d, t]) => `${d} ${t}`).join(', ');
}

// ── T-03 Class Dashboard ───────────────────────────────────
export async function getClassDashboard(offeringId: string, teacherUserId: string) {
  const offering = await requireOffering(offeringId, teacherUserId);

  // Attendance
  const sessions = await prisma.attendanceSession.findMany({
    where: { offeringId },
    select: { records: { select: { state: true } } },
  });
  const allRecords = sessions.flatMap(s => s.records);
  const present = allRecords.filter(r => r.state === 'PRESENT' || r.state === 'LATE').length;
  const attendancePct = allRecords.length === 0 ? 0 : Math.round((present / allRecords.length) * 100);

  // Submissions
  const submissions = await prisma.submission.findMany({
    where: { assignment: { offeringId } },
    select: { status: true, gradeMarks: true },
  });
  const graded = submissions.filter(s => s.status === 'GRADED');
  const avgGrade = graded.length === 0 ? 0 : Math.round(graded.reduce((sum, s) => sum + (s.gradeMarks ?? 0), 0) / graded.length);

  // Pending grading
  const pendingGrading = submissions.filter(s => s.status === 'PENDING' || s.status === 'UNDER_REVIEW').length;

  // Active quizzes
  const activeQuizzes = await prisma.quiz.count({
    where: { offeringId, status: 'PUBLISHED' },
  });

  // Weekly timetable
  const schedule = await prisma.offeringScheduleSlot.findMany({
    where: { offeringId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  return {
    offering: {
      id: offering.id,
      courseCode: offering.course.code,
      courseName: offering.course.name,
      section: offering.section.name,
      students: offering._count.enrollments,
    },
    stats: {
      attendancePct,
      avgGrade,
      pendingGrading,
      activeQuizzes,
      totalSessions: sessions.length,
      totalSubmissions: submissions.length,
    },
    schedule: schedule.map(s => ({
      id: s.id,
      day: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room,
    })),
  };
}

// ── T-04 Lecture Notes ─────────────────────────────────────
export async function listNotes(teacherUserId: string, offeringId: string) {
  await requireOffering(offeringId, teacherUserId);

  const notes = await prisma.lectureNote.findMany({
    where: { offeringId },
    orderBy: [{ unitTitle: 'asc' }, { createdAt: 'desc' }],
  });

  // Group by unit
  const unitMap = new Map<string, { unitTitle: string; topics: { id: string; title: string; status: string }[] }>();
  for (const note of notes) {
    const key = note.unitTitle;
    if (!unitMap.has(key)) unitMap.set(key, { unitTitle: key, topics: [] });
    unitMap.get(key)!.topics.push({
      id: note.id,
      title: note.topicTitle || note.title,
      status: note.status,
    });
  }

  return { units: [...unitMap.values()] };
}

export async function createNote(teacherUserId: string, body: {
  offeringId: string; unitTitle: string; topicTitle?: string;
  title: string; bodyJson: string; status?: string;
}) {
  await requireOffering(body.offeringId, teacherUserId);

  const note = await prisma.lectureNote.create({
    data: {
      offeringId: body.offeringId,
      unitTitle: body.unitTitle,
      topicTitle: body.topicTitle,
      title: body.title,
      bodyJson: body.bodyJson,
      status: body.status || 'DRAFT',
      publishedAt: body.status === 'PUBLISHED' ? new Date() : null,
      authorUserId: teacherUserId,
    },
  });

  await writeAudit({
    actorUserId: teacherUserId,
    institutionId: '',
    action: 'teacher.note.create',
    entityType: 'LectureNote',
    entityId: note.id,
  });

  return { id: note.id, status: note.status };
}

export async function updateNote(teacherUserId: string, noteId: string, body: {
  title?: string; bodyJson?: string; status?: string;
}) {
  const note = await prisma.lectureNote.findUnique({ where: { id: noteId } });
  if (!note) throw notFound('Note not found');
  if (note.authorUserId !== teacherUserId) throw notFound('Not your note');

  const updateData: Record<string, unknown> = { ...body };
  if (body.status === 'PUBLISHED' && note.status === 'DRAFT') {
    updateData.publishedAt = new Date();
  }

  const updated = await prisma.lectureNote.update({ where: { id: noteId }, data: updateData });
  return { id: updated.id, status: updated.status };
}

// ── T-05 Quizzes ───────────────────────────────────────────
export async function listQuizzes(teacherUserId: string, offeringId: string) {
  await requireOffering(offeringId, teacherUserId);

  const quizzes = await prisma.quiz.findMany({
    where: { offeringId },
    include: { _count: { select: { questions: true, attempts: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return quizzes.map(q => ({
    id: q.id,
    title: q.title,
    durationMin: q.durationMin,
    difficulty: q.difficulty,
    status: q.status,
    questionCount: q._count.questions,
    attemptCount: q._count.attempts,
  }));
}

export async function createQuiz(teacherUserId: string, body: {
  offeringId: string; title: string; durationMin: number;
  difficulty?: string; shuffleQuestions?: boolean; allowRetake?: boolean;
}) {
  await requireOffering(body.offeringId, teacherUserId);

  const quiz = await prisma.quiz.create({
    data: {
      offeringId: body.offeringId,
      title: body.title,
      durationMin: body.durationMin,
      difficulty: body.difficulty || 'MEDIUM',
      shuffleQuestions: body.shuffleQuestions ?? false,
      allowRetake: body.allowRetake ?? false,
      createdByUserId: teacherUserId,
    },
  });

  return { id: quiz.id, status: quiz.status };
}

export async function addQuestion(teacherUserId: string, quizId: string, body: {
  type: string; prompt: string; optionsJson: string;
  correctAnswer: string; marks?: number; order: number;
}) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) throw notFound('Quiz not found');
  if (quiz.createdByUserId !== teacherUserId) throw notFound('Not your quiz');

  const question = await prisma.question.create({
    data: {
      quizId,
      type: body.type,
      prompt: body.prompt,
      optionsJson: body.optionsJson,
      correctAnswer: body.correctAnswer,
      marks: body.marks || 1,
      order: body.order,
    },
  });

  return { id: question.id };
}

export async function publishQuiz(teacherUserId: string, quizId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) throw notFound('Quiz not found');
  if (quiz.createdByUserId !== teacherUserId) throw notFound('Not your quiz');
  if (quiz.status !== 'DRAFT') throw conflict('Quiz is already published');

  const updated = await prisma.quiz.update({ where: { id: quizId }, data: { status: 'PUBLISHED' } });
  return { id: updated.id, status: updated.status };
}

// ── T-06 Syllabus ──────────────────────────────────────────
export async function getSyllabus(teacherUserId: string, offeringId: string) {
  const offering = await requireOffering(offeringId, teacherUserId);

  const version = await prisma.syllabusVersion.findFirst({
    where: { courseId: offering.courseId },
    orderBy: { version: 'desc' },
    include: {
      units: {
        include: { topics: true },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!version) return { version: null, units: [] };

  return {
    version: {
      id: version.id,
      version: version.version,
      status: version.status,
      feedback: version.feedback,
    },
    units: version.units.map(u => ({
      id: u.id,
      title: u.title,
      order: u.order,
      topics: u.topics.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        order: t.order,
      })),
    })),
  };
}

export async function submitSyllabus(teacherUserId: string, courseId: string) {
  // Find or create latest version
  let version = await prisma.syllabusVersion.findFirst({
    where: { courseId },
    orderBy: { version: 'desc' },
  });

  if (!version) throw notFound('No syllabus version found for this course');

  if (version.status !== 'DRAFT' && version.status !== 'CHANGES_REQUESTED') {
    throw conflict(`Syllabus version is ${version.status}, cannot submit`);
  }

  const updated = await prisma.syllabusVersion.update({
    where: { id: version.id },
    data: { status: 'SUBMITTED', submittedByUserId: teacherUserId },
  });

  await writeAudit({
    actorUserId: teacherUserId,
    institutionId: '',
    action: 'teacher.syllabus.submit',
    entityType: 'SyllabusVersion',
    entityId: version.id,
    before: { status: version.status },
    after: { status: 'SUBMITTED' },
  });

  return { id: updated.id, status: updated.status };
}

// ── T-07 Syllabus Tracker ──────────────────────────────────
export async function updateSyllabusTopic(teacherUserId: string, topicId: string, body: {
  status: string;
}) {
  const topic = await prisma.syllabusTopic.findUnique({
    where: { id: topicId },
    include: { unit: { include: { syllabusVersion: { include: { course: { select: { offerings: { select: { teacherUserId: true } } } } } } } } },
  });
  if (!topic) throw notFound('Topic not found');

  // Verify the teacher teaches this course
  const isTeacher = topic.unit.syllabusVersion.course.offerings.some(o => o.teacherUserId === teacherUserId);
  if (!isTeacher) throw notFound('Not your course');

  const updated = await prisma.syllabusTopic.update({
    where: { id: topicId },
    data: {
      status: body.status,
      completedAt: body.status === 'COMPLETED' ? new Date() : null,
    },
  });

  return { id: updated.id, status: updated.status };
}

// ── T-08 Roster ────────────────────────────────────────────
export async function getRoster(teacherUserId: string, offeringId: string) {
  await requireOffering(offeringId, teacherUserId);

  const enrollments = await prisma.enrollment.findMany({
    where: { offeringId, status: 'ACTIVE' },
    include: {
      studentProfile: {
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
    orderBy: { studentProfile: { rollNo: 'asc' } },
  });

  // Get attendance stats per student
  const sessions = await prisma.attendanceSession.findMany({
    where: { offeringId },
    select: { id: true, records: { select: { studentProfileId: true, state: true } } },
  });

  const attendanceMap = new Map<string, { present: number; total: number }>();
  for (const session of sessions) {
    for (const record of session.records) {
      const existing = attendanceMap.get(record.studentProfileId) || { present: 0, total: 0 };
      existing.total++;
      if (record.state === 'PRESENT' || record.state === 'LATE') existing.present++;
      attendanceMap.set(record.studentProfileId, existing);
    }
  }

  return enrollments.map(e => {
    const att = attendanceMap.get(e.studentProfile.id);
    const pct = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null;
    return {
      id: e.studentProfile.id,
      name: e.studentProfile.user.fullName,
      email: e.studentProfile.user.email,
      rollNo: e.studentProfile.rollNo,
      section: e.studentProfile.section,
      attendancePct: pct,
    };
  });
}

// ── T-09 Schedule ──────────────────────────────────────────
export async function getSchedule(teacherUserId: string) {
  const offerings = await getTeacherOfferings(teacherUserId);
  const offeringIds = offerings.map(o => o.id);

  const slots = await prisma.offeringScheduleSlot.findMany({
    where: { offeringId: { in: offeringIds } },
    include: { offering: { select: { course: { select: { code: true, name: true } } } } },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  // Group by day
  const byDay = new Map<number, typeof slots>();
  for (const slot of slots) {
    const existing = byDay.get(slot.dayOfWeek) || [];
    existing.push(slot);
    byDay.set(slot.dayOfWeek, existing);
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    days: [1, 2, 3, 4, 5, 6, 0].map(d => ({
      id: String(d),
      label: dayNames[d],
      date: getDateForDay(d),
      items: (byDay.get(d) || []).map(s => ({
        id: s.id,
        time: formatTimeSlot(s.startTime, s.endTime),
        title: s.offering.course.name,
        location: s.room || 'TBA',
        mode: 'OFFLINE',
        canJoin: isWithinTimeWindow(s.startTime, s.endTime),
      })),
    })),
  };
}

function getDateForDay(dayOfWeek: number) {
  const d = new Date();
  const diff = dayOfWeek - d.getDay();
  d.setDate(d.getDate() + diff);
  return `${d.getDate()}`;
}

// ── T-10 Attendance ────────────────────────────────────────
export async function createAttendanceSession(teacherUserId: string, body: {
  offeringId: string; date: string;
}) {
  await requireOffering(body.offeringId, teacherUserId);

  const date = new Date(body.date);
  date.setHours(0, 0, 0, 0);

  const existing = await prisma.attendanceSession.findUnique({
    where: { offeringId_date: { offeringId: body.offeringId, date } },
  });
  if (existing) throw conflict('Attendance session already exists for this date');

  const session = await prisma.attendanceSession.create({
    data: {
      offeringId: body.offeringId,
      date,
      takenByUserId: teacherUserId,
      status: 'OPEN',
    },
  });

  return { id: session.id, status: session.status };
}

export async function markAttendance(teacherUserId: string, body: {
  sessionId: string;
  records: { studentProfileId: string; state: string }[];
}) {
  const session = await prisma.attendanceSession.findUnique({ where: { id: body.sessionId } });
  if (!session) throw notFound('Session not found');
  if (session.takenByUserId !== teacherUserId) throw notFound('Not your session');
  if (session.status === 'FINALIZED') throw conflict('Session already finalized');

  for (const record of body.records) {
    await prisma.attendanceRecord.upsert({
      where: { sessionId_studentProfileId: { sessionId: body.sessionId, studentProfileId: record.studentProfileId } },
      update: { state: record.state, markedAt: new Date() },
      create: { sessionId: body.sessionId, studentProfileId: record.studentProfileId, state: record.state },
    });
  }

  return { updated: body.records.length };
}

export async function finalizeAttendance(teacherUserId: string, sessionId: string) {
  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
  if (!session) throw notFound('Session not found');
  if (session.takenByUserId !== teacherUserId) throw notFound('Not your session');
  if (session.status === 'FINALIZED') throw conflict('Already finalized');

  const updated = await prisma.attendanceSession.update({
    where: { id: sessionId },
    data: { status: 'FINALIZED' },
  });

  return { id: updated.id, status: updated.status };
}

export async function getAttendanceStats(teacherUserId: string, offeringId: string) {
  await requireOffering(offeringId, teacherUserId);

  const sessions = await prisma.attendanceSession.findMany({
    where: { offeringId },
    include: { records: true },
    orderBy: { date: 'desc' },
  });

  const totalSessions = sessions.length;
  const allRecords = sessions.flatMap(s => s.records);
  const present = allRecords.filter(r => r.state === 'PRESENT').length;
  const late = allRecords.filter(r => r.state === 'LATE').length;
  const absent = allRecords.filter(r => r.state === 'ABSENT').length;

  return {
    totalSessions,
    overallPct: allRecords.length === 0 ? 0 : Math.round(((present + late) / allRecords.length) * 100),
    present,
    late,
    absent,
  };
}

// ── T-11 Assignments ──────────────────────────────────────
export async function listAssignments(teacherUserId: string, offeringId?: string) {
  const where: Record<string, unknown> = { createdByUserId: teacherUserId };
  if (offeringId) where.offeringId = offeringId;

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      offering: { select: { course: { select: { code: true, name: true } }, section: { select: { name: true } } } },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return assignments.map(a => ({
    id: a.id,
    title: a.title,
    courseCode: a.offering.course.code,
    courseName: a.offering.course.name,
    section: a.offering.section.name,
    dueAt: a.dueAt,
    maxMarks: a.maxMarks,
    status: a.status,
    submissionCount: a._count.submissions,
    createdAt: a.createdAt,
  }));
}

export async function createAssignment(teacherUserId: string, body: {
  offeringId: string; title: string; instructions?: string;
  dueAt?: string; maxMarks: number; weightage?: number;
  status?: string; rubricCriteria?: { title: string; maxMarks: number }[];
}) {
  await requireOffering(body.offeringId, teacherUserId);

  const assignment = await prisma.assignment.create({
    data: {
      offeringId: body.offeringId,
      title: body.title,
      instructions: body.instructions,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      maxMarks: body.maxMarks,
      weightage: body.weightage,
      status: body.status || 'DRAFT',
      createdByUserId: teacherUserId,
      rubricCriteria: body.rubricCriteria
        ? { create: body.rubricCriteria.map((r, i) => ({ ...r, order: i + 1 })) }
        : undefined,
    },
  });

  return { id: assignment.id, status: assignment.status };
}

export async function getAssignmentDetail(teacherUserId: string, assignmentId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      offering: { select: { course: { select: { code: true, name: true } }, section: { select: { name: true } } } },
      rubricCriteria: { orderBy: { order: 'asc' } },
      submissions: {
        include: {
          studentProfile: { select: { rollNo: true, user: { select: { fullName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!assignment) throw notFound('Assignment not found');
  if (assignment.createdByUserId !== teacherUserId) throw notFound('Not your assignment');

  return {
    id: assignment.id,
    title: assignment.title,
    instructions: assignment.instructions,
    courseCode: assignment.offering.course.code,
    courseName: assignment.offering.course.name,
    section: assignment.offering.section.name,
    dueAt: assignment.dueAt,
    maxMarks: assignment.maxMarks,
    weightage: assignment.weightage,
    status: assignment.status,
    rubric: assignment.rubricCriteria.map(r => ({
      id: r.id, title: r.title, maxMarks: r.maxMarks, order: r.order,
    })),
    submissions: assignment.submissions.map(s => ({
      id: s.id,
      studentName: s.studentProfile.user.fullName,
      rollNo: s.studentProfile.rollNo,
      status: s.status,
      gradeMarks: s.gradeMarks,
      feedback: s.feedback,
      submittedAt: s.submittedAt,
    })),
  };
}

// ── T-12 Grading ───────────────────────────────────────────
export async function gradeSubmission(teacherUserId: string, submissionId: string, body: {
  gradeMarks: number; feedback?: string;
  rubricScores?: { rubricCriterionId: string; marks: number }[];
}) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: { select: { createdByUserId: true, maxMarks: true } } },
  });
  if (!submission) throw notFound('Submission not found');
  if (submission.assignment.createdByUserId !== teacherUserId) throw notFound('Not your assignment');
  if (body.gradeMarks > submission.assignment.maxMarks) {
    throw unprocessable(`Grade ${body.gradeMarks} exceeds max marks ${submission.assignment.maxMarks}`);
  }

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      gradeMarks: body.gradeMarks,
      feedback: body.feedback,
      status: 'GRADED',
      gradedByUserId: teacherUserId,
      gradedAt: new Date(),
    },
  });

  // Save rubric scores
  if (body.rubricScores) {
    for (const rs of body.rubricScores) {
      await prisma.rubricScore.upsert({
        where: { submissionId_rubricCriterionId: { submissionId, rubricCriterionId: rs.rubricCriterionId } },
        update: { marks: rs.marks },
        create: { submissionId, rubricCriterionId: rs.rubricCriterionId, marks: rs.marks },
      });
    }
  }

  await writeAudit({
    actorUserId: teacherUserId,
    institutionId: '',
    action: 'teacher.submission.grade',
    entityType: 'Submission',
    entityId: submissionId,
    before: { status: submission.status },
    after: { status: 'GRADED', gradeMarks: body.gradeMarks },
  });

  return { id: updated.id, status: updated.status, gradeMarks: updated.gradeMarks };
}

// ── T-13 Exam Grade Entry ──────────────────────────────────
export async function enterExamGrade(teacherUserId: string, body: {
  evaluationPaperId: string; marksEntered: number;
}) {
  const paper = await prisma.evaluationPaper.findUnique({
    where: { id: body.evaluationPaperId },
    include: { evaluation: { select: { evaluatorUserId: true } } },
  });
  if (!paper) throw notFound('Evaluation paper not found');
  if (paper.evaluation.evaluatorUserId !== teacherUserId) throw notFound('Not your evaluation');

  const updated = await prisma.evaluationPaper.update({
    where: { id: body.evaluationPaperId },
    data: {
      marksEntered: body.marksEntered,
      status: 'DONE',
      evaluatorUserId: teacherUserId,
    },
  });

  // Update evaluation completed count
  const eval_ = await prisma.evaluation.findUnique({ where: { id: paper.evaluationId } });
  if (eval_) {
    const doneCount = await prisma.evaluationPaper.count({
      where: { evaluationId: eval_.id, status: 'DONE' },
    });
    await prisma.evaluation.update({
      where: { id: eval_.id },
      data: {
        completedPapers: doneCount,
        status: doneCount >= eval_.totalPapers ? 'COMPLETED' : 'IN_PROGRESS',
      },
    });
  }

  return { id: updated.id, status: updated.status };
}

// ── T-14 Performance Analytics ─────────────────────────────
export async function getPerformance(teacherUserId: string, offeringId: string) {
  const offering = await requireOffering(offeringId, teacherUserId);

  // Enrollments
  const enrollments = await prisma.enrollment.findMany({
    where: { offeringId, status: 'ACTIVE' },
    include: {
      studentProfile: {
        include: { user: { select: { fullName: true } } },
      },
    },
  });

  // Attendance per student
  const sessions = await prisma.attendanceSession.findMany({
    where: { offeringId },
    select: { records: { select: { studentProfileId: true, state: true } } },
  });
  const attMap = new Map<string, { present: number; total: number }>();
  for (const s of sessions) {
    for (const r of s.records) {
      const e = attMap.get(r.studentProfileId) || { present: 0, total: 0 };
      e.total++;
      if (r.state === 'PRESENT' || r.state === 'LATE') e.present++;
      attMap.set(r.studentProfileId, e);
    }
  }

  // Grades per student
  const submissions = await prisma.submission.findMany({
    where: { assignment: { offeringId }, status: 'GRADED' },
    select: { studentProfileId: true, gradeMarks: true, assignment: { select: { maxMarks: true } } },
  });
  const gradeMap = new Map<string, { total: number; earned: number; count: number }>();
  for (const s of submissions) {
    const e = gradeMap.get(s.studentProfileId) || { total: 0, earned: 0, count: 0 };
    e.total += s.assignment.maxMarks;
    e.earned += s.gradeMarks ?? 0;
    e.count++;
    gradeMap.set(s.studentProfileId, e);
  }

  const students = enrollments.map(en => {
    const att = attMap.get(en.studentProfile.id);
    const grade = gradeMap.get(en.studentProfile.id);
    const attPct = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null;
    const avgGrade = grade && grade.count > 0 ? Math.round((grade.earned / grade.total) * 100) : null;
    return {
      id: en.studentProfile.id,
      name: en.studentProfile.user.fullName,
      rollNo: en.studentProfile.rollNo,
      attendancePct: attPct,
      avgGrade,
      status: attPct !== null && attPct < 75 ? 'AT_RISK' : 'OPTIMAL',
    };
  });

  // Class averages
  const validAtt = students.filter(s => s.attendancePct !== null);
  const validGrade = students.filter(s => s.avgGrade !== null);
  const classAvg = {
    attendance: validAtt.length ? Math.round(validAtt.reduce((s, st) => s + (st.attendancePct ?? 0), 0) / validAtt.length) : 0,
    grade: validGrade.length ? Math.round(validGrade.reduce((s, st) => s + (st.avgGrade ?? 0), 0) / validGrade.length) : 0,
  };

  return {
    offering: {
      id: offering.id,
      courseCode: offering.course.code,
      courseName: offering.course.name,
      section: offering.section.name,
    },
    overview: {
      classAverage: classAvg,
      totalStudents: students.length,
      atRisk: students.filter(s => s.status === 'AT_RISK').length,
      optimal: students.filter(s => s.status === 'OPTIMAL').length,
    },
    students,
  };
}

// ── T-15 Notifications + Broadcast ─────────────────────────
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
    notifications: items.map(n => ({
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
  teacherUserId: string,
  institutionId: string,
  body: { audience: string; offeringId?: string; title: string; body: string },
) {
  let recipientIds: string[] = [];

  if (body.audience === 'offering' && body.offeringId) {
    const enrollments = await prisma.enrollment.findMany({
      where: { offeringId: body.offeringId, status: 'ACTIVE' },
      include: { studentProfile: { select: { userId: true } } },
    });
    recipientIds = enrollments.map(e => e.studentProfile.userId);
  } else {
    // All students in teacher's offerings
    const offerings = await getTeacherOfferings(teacherUserId);
    const offeringIds = offerings.map(o => o.id);
    if (offeringIds.length > 0) {
      const enrollments = await prisma.enrollment.findMany({
        where: { offeringId: { in: offeringIds }, status: 'ACTIVE' },
        include: { studentProfile: { select: { userId: true } } },
      });
      recipientIds = [...new Set(enrollments.map(e => e.studentProfile.userId))];
    }
  }

  const broadcast = await prisma.broadcast.create({
    data: {
      institutionId,
      senderUserId: teacherUserId,
      audienceJson: JSON.stringify({ audience: body.audience, offeringId: body.offeringId }),
      title: body.title,
      body: body.body,
      channels: 'IN_APP',
      sentAt: new Date(),
    },
  });

  if (recipientIds.length > 0) {
    await prisma.notification.createMany({
      data: recipientIds.map(rid => ({
        institutionId,
        recipientUserId: rid,
        type: 'BROADCAST',
        title: body.title,
        body: body.body,
        sourceModule: 'teacher',
      })),
    });
  }

  await writeAudit({
    actorUserId: teacherUserId,
    institutionId,
    action: 'teacher.broadcast.send',
    entityType: 'Broadcast',
    entityId: broadcast.id,
    after: { audience: body.audience, recipients: recipientIds.length },
  });

  return { id: broadcast.id, recipients: recipientIds.length };
}

// ── T-16 Profile ───────────────────────────────────────────
export async function getProfile(userId: string, institutionId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, institutionId },
    include: {
      roles: true,
      staffProfile: true,
    },
  });
  if (!user) throw notFound('User not found');

  // Teaching stats
  const offerings = await prisma.courseOffering.findMany({
    where: { teacherUserId: userId },
    select: { _count: { select: { enrollments: true, scheduleSlots: true } } },
  });

  const totalStudents = offerings.reduce((s, o) => s + o._count.enrollments, 0);
  const totalWorkload = offerings.reduce((s, o) => s + o._count.scheduleSlots, 0);

  // Graded submissions count
  const gradedCount = await prisma.submission.count({
    where: { gradedByUserId: userId },
  });

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    roles: user.roles.map(r => r.role),
    designation: user.staffProfile?.designation ?? null,
    employeeNo: user.staffProfile?.employeeNo ?? null,
    departmentId: user.staffProfile?.departmentId ?? null,
    stats: {
      activeClasses: offerings.length,
      totalStudents,
      weeklyHours: totalWorkload,
      gradedSubmissions: gradedCount,
    },
  };
}
