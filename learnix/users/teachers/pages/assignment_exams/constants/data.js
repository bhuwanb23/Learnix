// Data constants for Assignment & Exams dashboard - teacher view

export const HEADER = {
  title: 'Academic Curator',
};

export const STATS = [
  { id: 'active', label: 'Active Assignments', value: 5, icon: 'assignment', color: '#0050d4' },
  { id: 'due', label: 'Due This Week', value: 3, icon: 'schedule', color: '#d97706' },
  { id: 'grading', label: 'Awaiting Grading', value: 12, icon: 'rate-review', color: '#702ae1' },
  { id: 'exams', label: 'Upcoming Exams', value: 2, icon: 'fact-check', color: '#16a34a' },
];

export const ACTIVE_ASSIGNMENTS = [
  {
    id: 'ps04',
    title: 'Problem Set #04',
    subject: 'Advanced Calculus',
    classCode: 'CAL-101',
    dueLabel: 'Due Oct 12',
    submitted: 18,
    total: 24,
    graded: 12,
    color: '#0050d4',
  },
  {
    id: 'lab01',
    title: 'Lab Report: Optics',
    subject: 'Theoretical Physics',
    classCode: 'PHY-210',
    dueLabel: 'Due Oct 14',
    submitted: 9,
    total: 24,
    graded: 0,
    color: '#702ae1',
  },
  {
    id: 'resp02',
    title: 'Reading Response: Memory',
    subject: 'Advanced Cognitive Psychology',
    classCode: 'PSY-402',
    dueLabel: 'Due Oct 20',
    submitted: 4,
    total: 24,
    graded: 0,
    color: '#16a34a',
  },
];

export const UPCOMING_EXAMS = [
  {
    id: 'midterm-calc',
    title: 'Midterm Examination',
    subject: 'Advanced Calculus',
    classCode: 'CAL-101',
    date: 'Oct 25',
    time: '10:00 – 12:00',
    room: 'Room B-204',
    color: '#0050d4',
  },
  {
    id: 'quiz2-phy',
    title: 'Quiz 2',
    subject: 'Theoretical Physics',
    classCode: 'PHY-210',
    date: 'Oct 18',
    time: '09:00 – 10:00',
    room: 'Room A-112',
    color: '#702ae1',
  },
];

export const QUICK_ACTIONS = [
  {
    id: 'create',
    title: 'Create Assignment',
    subtitle: 'Give a new assignment to a class',
    icon: 'add-box',
    color: '#0050d4',
    primary: true,
  },
  {
    id: 'exam',
    title: 'Schedule Exam',
    subtitle: 'Plan an exam and its schedule',
    icon: 'event',
    color: '#702ae1',
    primary: false,
  },
  {
    id: 'export',
    title: 'Export Grades',
    subtitle: 'CSV / PDF reports for a class',
    icon: 'file-download',
    color: '#d97706',
    primary: false,
  },
];

export const ALERTS = [
  {
    id: 'alert1',
    title: 'Low submission rate in Physics',
    subtitle: 'Last activity: 4h ago',
    icon: 'warning',
    color: '#b31b25',
  },
  {
    id: 'alert2',
    title: 'Grade dispute: Problem Set #03',
    subtitle: '2 pending reviews',
    icon: 'rate-review',
    color: '#a23800',
  },
];