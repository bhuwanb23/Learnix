export const ROLES = [
  { id: 'R1', name: 'Super Admin', users: 2, desc: 'Full access to all modules and settings', permissions: 24, color: '#7c3aed' },
  { id: 'R2', name: 'Admin', users: 4, desc: 'Manage students, teachers, courses, reports', permissions: 20, color: '#059669' },
  { id: 'R3', name: 'Teacher', users: 89, desc: 'Classes, syllabus, quizzes, assignments, grading', permissions: 12, color: '#d97706' },
  { id: 'R4', name: 'Placement Cell', users: 3, desc: 'Manage drives, companies, applications', permissions: 8, color: '#0284c7' },
  { id: 'R5', name: 'Examination Cell', users: 3, desc: 'Exams, timetable, results, hall tickets', permissions: 9, color: '#dc2626' },
  { id: 'R6', name: 'Library Staff', users: 2, desc: 'Catalog, issues, returns, fines', permissions: 6, color: '#0891b2' },
  { id: 'R7', name: 'Accounts', users: 2, desc: 'Fees, collections, receipts, scholarships', permissions: 7, color: '#dc2626' },
  { id: 'R8', name: 'Student', users: 1234, desc: 'Classes, assignments, events, placement portal', permissions: 5, color: '#7c3aed' },
];

export const PERMISSION_GROUPS = [
  { id: 'academics', name: 'Academics', permissions: ['Syllabus', 'Quizzes', 'Assignments', 'Grading'] },
  { id: 'exams', name: 'Exams', permissions: ['Timetable', 'Results', 'Hall Tickets', 'Cheating Cases'] },
  { id: 'students', name: 'Students', permissions: ['View', 'Add/Edit', 'Enroll/Depart', 'Reports'] },
  { id: 'finance', name: 'Finance', permissions: ['Fees', 'Collections', 'Receipts', 'Scholarships'] },
];

export const ACADEMIC_YEAR = {
  current: '2026-27',
  startDate: 'Jul 1, 2026',
  endDate: 'Jun 30, 2027',
  semesters: ['Sem 1: Jul-Dec', 'Sem 2: Jan-Jun'],
  examWeeks: 'Weeks 16 & 32',
  previousYears: ['2025-26', '2024-25', '2023-24'],
};

export const SYSTEM_CONFIG = [
  { id: 'S1', label: 'Institution Name', value: 'Learnix Institute of Technology', icon: 'business' },
  { id: 'S2', label: 'Support Email', value: 'support@learnix.edu', icon: 'mail' },
  { id: 'S3', label: 'Attendance Threshold', value: '75% (min for exams)', icon: 'checkmark-done' },
  { id: 'S4', label: 'Backlog Limit', value: '2 (max before probation)', icon: 'alert' },
  { id: 'S5', label: 'Passing Marks', value: '40% (theory) • 50% (practical)', icon: 'ribbon' },
  { id: 'S6', label: 'Exam Re-evaluation Window', value: '7 days after results', icon: 'time' },
];