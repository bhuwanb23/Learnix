export const INSTITUTION_STATS = [
  { id: 'students', label: 'Students', value: '1,234', icon: 'people', color: '#2563eb', subtitle: '328 new this year' },
  { id: 'teachers', label: 'Teachers', value: '89', icon: 'school', color: '#059669', subtitle: '12 departments' },
  { id: 'courses', label: 'Courses', value: '156', icon: 'book', color: '#dc2626', subtitle: '24 programs' },
  { id: 'attendance', label: 'Attendance', value: '94.2%', icon: 'checkmark-done', color: '#d97706', subtitle: 'Today overall' },
];

export const ADMIN_MODULES = [
  { id: 'AcademicsExaminations', title: 'Academics & Exams', icon: 'school', color: '#2563eb', desc: 'Exams, evaluations, cheating detection' },
  { id: 'Timetable', title: 'Timetable', icon: 'calendar', color: '#0284c7', desc: 'Schedules & teacher allocation' },
  { id: 'Attendance', title: 'Attendance', icon: 'checkmark-done', color: '#059669', desc: 'Daily tracking & reports' },
  { id: 'Assignments', title: 'Assignments', icon: 'document-text', color: '#d97706', desc: 'Submissions & grading' },
  { id: 'Placements', title: 'Placements', icon: 'briefcase', color: '#0891b2', desc: 'Drives, jobs & offers' },
  { id: 'Events', title: 'Events', icon: 'calendar-outline', color: '#dc2626', desc: 'Campus events & registrations' },
  { id: 'Library', title: 'Library', icon: 'book', color: '#2563eb', desc: 'Catalog, issues & fines' },
  { id: 'Fees', title: 'Fees & Finance', icon: 'cash', color: '#059669', desc: 'Collections, dues & receipts' },
  { id: 'Announcements', title: 'Announcements', icon: 'megaphone', color: '#d97706', desc: 'Broadcast to students & staff' },
  { id: 'Settings', title: 'Settings', icon: 'settings', color: '#475569', desc: 'Roles, permissions & config' },
];

export const RECENT_ACTIVITY = [
  {
    id: '1',
    type: 'person-add',
    title: 'New student enrolled',
    description: 'Rahul Sharma joined B.Tech CSE — Semester 3',
    time: '2 minutes ago',
    color: '#059669',
  },
  {
    id: '2',
    type: 'warning',
    title: 'Cheating alert raised',
    description: 'AI detected suspicious activity in Chemistry mid-term',
    time: '18 minutes ago',
    color: '#ef4444',
  },
  {
    id: '3',
    type: 'calendar',
    title: 'Exam timetable published',
    description: 'Semester 4 final exams scheduled for Dec 15-20',
    time: '1 hour ago',
    color: '#2563eb',
  },
  {
    id: '4',
    type: 'cash',
    title: 'Fee payment received',
    description: '₹42,000 collected from Priya Patel (BBA Sem 1)',
    time: '3 hours ago',
    color: '#d97706',
  },
  {
    id: '5',
    type: 'briefcase',
    title: 'Placement drive approved',
    description: 'TCS campus drive scheduled for Dec 10',
    time: '5 hours ago',
    color: '#0284c7',
  },
];

export const QUICK_ACTIONS = [
  { id: 'add-student', label: 'Add Student', icon: 'person-add', color: '#2563eb', target: 'Students' },
  { id: 'add-teacher', label: 'Add Teacher', icon: 'school', color: '#059669', target: 'Teachers' },
  { id: 'create-course', label: 'Create Course', icon: 'book', color: '#dc2626', target: 'Courses' },
  { id: 'new-announcement', label: 'New Announcement', icon: 'megaphone', color: '#d97706', target: 'Announcements' },
  { id: 'exam-timetable', label: 'Exam Timetable', icon: 'calendar', color: '#2563eb', target: 'AcademicsExaminations' },
  { id: 'generate-report', label: 'Generate Report', icon: 'analytics', color: '#0284c7', target: 'Reports' },
];