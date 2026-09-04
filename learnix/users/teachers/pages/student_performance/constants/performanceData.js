// Data constants for Student Performance - Academic Curator
// Model: a teacher teaches several subjects, each subject to 1-3 class sections.
// A section can study 2-3 subjects with this teacher (TEACHING matrix below).

export const HEADER = {
  title: 'Academic Curator',
};

export const SUBJECTS = [
  { id: 'calc', name: 'Advanced Calculus', color: '#0050d4' },
  { id: 'phy', name: 'Theoretical Physics', color: '#702ae1' },
  { id: 'psy', name: 'Advanced Cognitive Psychology', color: '#16a34a' },
];

export const CLASSES = [
  { id: 'sec-a', label: 'Section A', color: '#0050d4' },
  { id: 'sec-b', label: 'Section B', color: '#702ae1' },
  { id: 'sec-c', label: 'Section C', color: '#d97706' },
];

// Which sections each subject is taught to (by this teacher).
// Same subject -> 2-3 classes; a class -> 2-3 subjects.
export const TEACHING = {
  calc: ['sec-a', 'sec-b'],
  phy: ['sec-a', 'sec-c'],
  psy: ['sec-b'],
};

export const STUDENT_BASE = [
  { id: 'JS', name: 'Julianna Sterling', studentId: '22BSCS042', attendance: 94, avatarBg: '#dcc9ff', avatarText: '#5b00c7', trendShape: 'up' },
  { id: 'MK', name: 'Marcus Kinsley', studentId: '22BSCS017', attendance: 61, avatarBg: '#fde3e5', avatarText: '#b31b25', trendShape: 'down' },
  { id: 'AP', name: 'Ananya Patel', studentId: '22BSCS023', attendance: 97, avatarBg: '#d3e9ff', avatarText: '#0050d4', trendShape: 'up' },
  { id: 'RC', name: 'Rohan Chatterjee', studentId: '22BSCS031', attendance: 72, avatarBg: '#fde3e5', avatarText: '#b31b25', trendShape: 'down' },
  { id: 'SK', name: 'Sofia Kapoor', studentId: '22BSCS055', attendance: 89, avatarBg: '#c8f0d8', avatarText: '#16a34a', trendShape: 'steady' },
  { id: 'DL', name: 'Daniel Lewis', studentId: '22BSCS009', attendance: 91, avatarBg: '#fff0c9', avatarText: '#d97706', trendShape: 'steady' },
  { id: 'MI', name: 'Meera Iyer', studentId: '22BSCS064', attendance: 83, avatarBg: '#d3e9ff', avatarText: '#0050d4', trendShape: 'up' },
  { id: 'TK', name: 'Tariq Khan', studentId: '22BSCS027', attendance: 95, avatarBg: '#dcc9ff', avatarText: '#5b00c7', trendShape: 'up' },
  { id: 'EM', name: 'Emily Marsh', studentId: '22BSCS071', attendance: 88, avatarBg: '#c8f0d8', avatarText: '#16a34a', trendShape: 'steady' },
  { id: 'VS', name: 'Vikram Singh', studentId: '22BSCS038', attendance: 79, avatarBg: '#fff0c9', avatarText: '#d97706', trendShape: 'steady' },
];

// Base grade per student per subject (class offset is applied on top).
export const SUBJECT_GRADES = {
  calc: { JS: 98, MK: 61, AP: 94, RC: 68, SK: 87, DL: 91, MI: 78, TK: 95, EM: 84, VS: 72 },
  phy: { JS: 88, MK: 55, AP: 90, RC: 71, SK: 81, DL: 86, MI: 74, TK: 92, EM: 79, VS: 66 },
  psy: { JS: 95, MK: 64, AP: 92, RC: 59, SK: 89, DL: 83, MI: 85, TK: 90, EM: 77, VS: 81 },
};

// Grade adjustment per section (same subject taught in 2 sections performs slightly differently).
export const CLASS_OFFSETS = {
  'sec-a': 0,
  'sec-b': -4,
  'sec-c': -2,
};

export const SUBJECT_SKILLS = {
  calc: ['Limits & Continuity', 'Derivatives', 'Integration by Parts', 'Trig Substitution', 'Series Convergence'],
  phy: ['Kinematics', 'Optics & Waves', 'Thermodynamics', 'Electromagnetism'],
  psy: ['Memory Models', 'Learning Theories', 'Conditioning', 'Cognitive Biases'],
};

export const SUBJECT_GAPS = {
  calc: [
    { id: 'calc1', topic: 'Integration by Parts', mastery: 45, color: '#a23800', note: 'Common error: constant of integration' },
    { id: 'calc2', topic: 'Trig Substitution', mastery: 68, color: '#0050d4', note: 'Improving: last quiz showed +12% growth' },
    { id: 'calc3', topic: 'Limit Laws', mastery: 89, color: '#16a34a', note: '' },
  ],
  phy: [
    { id: 'phy1', topic: 'Optics & Waves', mastery: 52, color: '#a23800', note: 'Weak in lens diagrams and ray tracing' },
    { id: 'phy2', topic: 'Thermodynamics', mastery: 71, color: '#0050d4', note: 'Improving steadily across labs' },
    { id: 'phy3', topic: 'Kinematics', mastery: 90, color: '#16a34a', note: '' },
  ],
  psy: [
    { id: 'psy1', topic: 'Conditioning', mastery: 58, color: '#a23800', note: 'Confusing classical vs operant conditioning' },
    { id: 'psy2', topic: 'Memory Models', mastery: 74, color: '#0050d4', note: 'Improving after the review session' },
    { id: 'psy3', topic: 'Learning Theories', mastery: 88, color: '#16a34a', note: '' },
  ],
};

export const SUBJECT_SUGGESTIONS = {
  calc: [
    { id: 'calc-s1', text: 'Schedule a remedial session for Integration by Parts this Friday. 12 students are struggling with the algebraic manipulation.', action: 'Create Event', color: '#702ae1' },
    { id: 'calc-s2', text: 'Assign peer-mentoring groups. Julianna S. and Marcus K. show complementary strengths in Problem Set #3.', action: 'Draft Groupings', color: '#0050d4' },
  ],
  phy: [
    { id: 'phy-s1', text: 'Run a quick lab recap on ray tracing before the next optics quiz — mastery is at 52%.', action: 'Plan Recap', color: '#702ae1' },
    { id: 'phy-s2', text: 'Share the worked solutions for the thermodynamics worksheet to lift steady learners.', action: 'Share Notes', color: '#0050d4' },
  ],
  psy: [
    { id: 'psy-s1', text: 'Prepare a side-by-side chart of classical vs operant conditioning to address the common confusion.', action: 'Create Handout', color: '#702ae1' },
    { id: 'psy-s2', text: 'Pair students with strong memory-model notes with peers below 70% before the unit test.', action: 'Draft Groupings', color: '#0050d4' },
  ],
};

// ------------------------- Helpers -------------------------

export const subjectsForClass = (classId) => SUBJECTS.filter((subject) => TEACHING[subject.id].includes(classId));

export const classesForSubject = (subjectId) => CLASSES.filter((cls) => TEACHING[subjectId].includes(cls.id));

const STATUS_TIERS = [
  { min: 85, label: 'Optimal', color: '#16a34a', bg: '#dcfce7' },
  { min: 70, label: 'Steady', color: '#ca8a04', bg: '#fef3c7' },
  { min: 0, label: 'At Risk', color: '#b31b25', bg: '#fde3e5' },
];

const DRIVER_POOL = {
  top: ['Strong Quiz Performance', 'Consistent Attendance', 'Excellent Assignments'],
  mid: ['Steady Improvement', 'Good Class Participation', 'Inconsistent Attendance'],
  low: ['Missing Assignments', 'Low Quiz Scores', 'Irregular Attendance'],
};

const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));

const trendFor = (shape, grade) => {
  if (shape === 'up') return [grade - 30, grade - 14, grade];
  if (shape === 'down') return [grade, grade - 14, grade - 30];
  return [grade - 10, grade, grade - 8];
};

const driverFor = (grade) => {
  const pool = grade >= 85 ? DRIVER_POOL.top : grade >= 70 ? DRIVER_POOL.mid : DRIVER_POOL.low;
  return pool[(grade * 7) % pool.length];
};

const statusFor = (grade) => STATUS_TIERS.find((tier) => grade >= tier.min) || STATUS_TIERS[2];

export function getStudentsFor(subjectId, classId) {
  const offset = CLASS_OFFSETS[classId] || 0;
  const grades = SUBJECT_GRADES[subjectId] || {};
  const list = STUDENT_BASE.map((base) => {
    const grade = clamp(Math.round((grades[base.id] || 70) + offset), 38, 100);
    const status = statusFor(grade);
    return {
      ...base,
      grade,
      status: status.label,
      statusColor: status.color,
      statusBg: status.bg,
      trend: trendFor(base.trendShape, grade),
      trendColor: '#0050d4',
      keyDriver: driverFor(grade),
      driverColor: '#702ae1',
    };
  });
  return [...list].sort((a, b) => b.grade - a.grade).map((student, index) => ({ ...student, rank: index + 1 }));
}

export function getOverviewFor(subjectId, classId) {
  const students = getStudentsFor(subjectId, classId);
  const avg = Math.round(students.reduce((sum, s) => sum + s.grade, 0) / students.length);
  const attendance = Math.round(students.reduce((sum, s) => sum + s.attendance, 0) / students.length);
  const participation = Number((5 + (avg / 100) * 3.5).toFixed(1));
  return {
    classAverage: { value: avg, trend: '+2.4%', chartData: [45, 55, 50, 62, 68, 74, avg] },
    attendanceRate: { value: attendance, label: 'Attendance Rate' },
    participation: { value: participation, max: 10, label: 'Participation' },
    atRisk: students.filter((s) => s.grade < 70).length,
    top: students.filter((s) => s.grade >= 85).length,
    total: students.length,
  };
}

export function getFiltersFor(subjectId, classId) {
  const students = getStudentsFor(subjectId, classId);
  const count = (fn) => students.filter(fn).length;
  return [
    { id: 'all', label: `All (${students.length})` },
    { id: 'top', label: `Top (${count((s) => s.grade >= 85)})` },
    { id: 'steady', label: `Steady (${count((s) => s.grade >= 70 && s.grade < 85)})` },
    { id: 'support', label: `Needs Support (${count((s) => s.grade < 70)})` },
  ];
}

export function filterStudents(students, filterId) {
  if (filterId === 'top') return students.filter((s) => s.grade >= 85);
  if (filterId === 'steady') return students.filter((s) => s.grade >= 70 && s.grade < 85);
  if (filterId === 'support') return students.filter((s) => s.grade < 70);
  return students;
}

export function getStudentDetail(subjectId, classId, studentId) {
  const student = getStudentsFor(subjectId, classId).find((s) => s.id === studentId);
  if (!student) return null;
  const grade = student.grade;
  const skills = SUBJECT_SKILLS[subjectId] || [];
  const mastery = skills.map((skill, index) => ({
    skill,
    value: clamp(grade - index * 9 + (student.attendance % 5) - 8, 25, 98),
  }));
  const sorted = [...mastery].sort((a, b) => b.value - a.value);
  return {
    ...student,
    quizzes: [clamp(grade - 16, 20, 100), clamp(grade - 9, 20, 100), clamp(grade - 4, 20, 100), grade],
    assignments: [clamp(grade - 11, 20, 100), clamp(grade - 6, 20, 100), grade],
    exam: clamp(grade - 2, 20, 100),
    strengths: sorted.slice(0, 2).map((m) => m.skill),
    improvements: sorted.slice(-2).map((m) => m.skill),
    note:
      grade >= 85
        ? 'Strong performer — keeps engaging with advanced material and helps peers.'
        : grade >= 70
            ? 'Performing steadily; focus on the weak skills below to push into the top tier.'
            : 'Needs attention — recommend a 1:1 session and an attendance follow-up.',
  };
}

export function compareSubjectsInClass(classId) {
  return subjectsForClass(classId).map((subject) => {
    const students = getStudentsFor(subject.id, classId);
    return {
      subject,
      avg: Math.round(students.reduce((sum, s) => sum + s.grade, 0) / students.length),
      atRisk: students.filter((s) => s.grade < 70).length,
      total: students.length,
    };
  });
}

export function compareClassesForSubject(subjectId) {
  return classesForSubject(subjectId).map((cls) => {
    const students = getStudentsFor(subjectId, cls.id);
    return {
      class: cls,
      avg: Math.round(students.reduce((sum, s) => sum + s.grade, 0) / students.length),
      atRisk: students.filter((s) => s.grade < 70).length,
      total: students.length,
    };
  });
}