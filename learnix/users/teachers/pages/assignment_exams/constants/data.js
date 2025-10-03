// Data constants for Assignment & Exams page

export const OVERVIEW_CARDS = [
  {
    id: 'activeAssignments',
    value: 24,
    label: 'Active Assignments',
    badge: '+5 Today',
    badgeColor: '#16A34A',
    iconBg: '#DBEAFE',
    iconColor: '#1E40AF',
    icon: '📄',
  },
  {
    id: 'pendingSubmissions',
    value: 12,
    label: 'Submissions',
    badge: 'Pending',
    badgeColor: '#EA580C',
    iconBg: '#FFEDD5',
    iconColor: '#EA580C',
    icon: '⏰',
  },
  {
    id: 'upcomingExams',
    value: 3,
    label: 'Upcoming Exams',
    badge: 'This Week',
    badgeColor: '#9333EA',
    iconBg: '#F3E8FF',
    iconColor: '#9333EA',
    icon: '🗓️',
  },
  {
    id: 'gradedItems',
    value: 156,
    label: 'Graded Items',
    badge: '87% Done',
    badgeColor: '#16A34A',
    iconBg: '#DCFCE7',
    iconColor: '#16A34A',
    icon: '✅',
  },
];

export const QUICK_ACTIONS = [
  { id: 'createAssignment', title: 'Create Assignment', primary: true, icon: '＋' },
  { id: 'viewSubmissions', title: 'View Submissions', primary: false, icon: '👁️' },
  { id: 'grading', title: 'Grading & Feedback', primary: false, icon: '⭐' },
  { id: 'examScheduler', title: 'Exam Scheduler', primary: false, icon: '📅' },
];

export const UPLOAD_RESULT = { id: 'upload', title: 'Upload Results', icon: '⬆️' };

export const PERFORMANCE_SERIES = [65, 78, 85, 72, 90];
export const PERFORMANCE_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export const DEADLINE_SERIES = [3, 5, 8, 12];
export const DEADLINE_LABELS = ['Today', 'Tomorrow', 'This Week', 'Next Week'];

export const RECENT_ACTIVITY = [
  { id: 'a1', title: 'Math Quiz 3 submitted', time: '2 minutes ago', tint: '#EFF6FF', chipBg: '#1E40AF' },
  { id: 'a2', title: 'Science Lab Report graded', time: '15 minutes ago', tint: '#ECFDF5', chipBg: '#16A34A' },
  { id: 'a3', title: 'History Exam scheduled', time: '1 hour ago', tint: '#F5F3FF', chipBg: '#9333EA' },
];


