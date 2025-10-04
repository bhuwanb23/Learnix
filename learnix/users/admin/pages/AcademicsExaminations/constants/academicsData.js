// Academics & Examinations Data Constants

export const QUICK_STATS = [
  {
    id: 'active-exams',
    title: 'Active Exams',
    value: '12',
    subtitle: 'This Week',
    icon: 'calendar-check',
    gradient: ['#7c3aed', '#8b5cf6'],
    bgColor: '#7c3aed',
  },
  {
    id: 'pass-rate',
    title: 'Pass Rate',
    value: '87%',
    subtitle: 'Overall',
    icon: 'chart-line',
    gradient: ['#10b981', '#059669'],
    bgColor: '#10b981',
  },
  {
    id: 'cheating-cases',
    title: 'Cheating Cases',
    value: '5',
    subtitle: 'AI Detected',
    icon: 'triangle-exclamation',
    gradient: ['#f59e0b', '#d97706'],
    bgColor: '#f59e0b',
  },
  {
    id: 'evaluations',
    title: 'Evaluations',
    value: '23',
    subtitle: 'Pending',
    icon: 'clock',
    gradient: ['#8b5cf6', '#7c3aed'],
    bgColor: '#8b5cf6',
  },
];

export const SEMESTER_OPTIONS = [
  { id: '1', label: 'Semester 1', value: 'semester-1' },
  { id: '2', label: 'Semester 2', value: 'semester-2' },
  { id: '3', label: 'Semester 3', value: 'semester-3' },
  { id: '4', label: 'Semester 4', value: 'semester-4' },
];

export const EXAM_TYPE_OPTIONS = [
  { id: 'mid-term', label: 'Mid Term', value: 'mid-term' },
  { id: 'final-exam', label: 'Final Exam', value: 'final-exam' },
  { id: 'quiz', label: 'Quiz', value: 'quiz' },
  { id: 'assignment', label: 'Assignment', value: 'assignment' },
];

export const CONFLICT_STATUS = [
  {
    id: 'room-conflicts',
    label: 'Room Conflicts',
    count: 0,
    status: 'success',
    color: '#10b981',
  },
  {
    id: 'teacher-conflicts',
    label: 'Teacher Conflicts',
    count: 0,
    status: 'success',
    color: '#10b981',
  },
  {
    id: 'subject-overlaps',
    label: 'Subject Overlaps',
    count: 2,
    status: 'warning',
    color: '#f59e0b',
  },
];

export const EVALUATION_STATS = {
  completed: 847,
  inProgress: 156,
  pending: 97,
  total: 1100,
  progressPercentage: 77,
};

export const SUBJECT_PROGRESS = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    progress: 92,
    color: '#10b981',
    status: 'excellent',
  },
  {
    id: 'physics',
    name: 'Physics',
    progress: 78,
    color: '#f59e0b',
    status: 'good',
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    progress: 65,
    color: '#ef4444',
    status: 'needs-improvement',
  },
  {
    id: 'english',
    name: 'English',
    progress: 88,
    color: '#10b981',
    status: 'excellent',
  },
];

export const CHEATING_DETECTION_STATS = {
  timingAnalysis: {
    count: 3,
    label: 'Suspicious patterns',
    color: '#ef4444',
    bgColor: '#fef2f2',
  },
  answerSimilarity: {
    count: 2,
    label: 'Identical responses',
    color: '#f59e0b',
    bgColor: '#fffbeb',
  },
};

export const CHEATING_ALERTS = [
  {
    id: '1',
    studentName: 'John Smith',
    studentAvatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-3.jpg',
    issue: 'Suspicious timing pattern',
    riskLevel: 'High Risk',
    riskColor: '#ef4444',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  {
    id: '2',
    studentName: 'Sarah Wilson',
    studentAvatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-4.jpg',
    issue: 'Answer similarity detected',
    riskLevel: 'Medium Risk',
    riskColor: '#f59e0b',
    bgColor: '#fffbeb',
    borderColor: '#fed7aa',
  },
  {
    id: '3',
    studentName: 'Mike Johnson',
    studentAvatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-8.jpg',
    issue: 'Rapid response pattern',
    riskLevel: 'Low Risk',
    riskColor: '#eab308',
    bgColor: '#fefce8',
    borderColor: '#fde047',
  },
];

export const SMART_SUGGESTIONS = {
  title: 'Smart Suggestions',
  description: 'Optimal exam scheduling available for Dec 15-20. 94% efficiency score.',
  icon: 'lightbulb',
  color: '#7c3aed',
  bgColor: '#f3f4f6',
  borderColor: '#e5e7eb',
};

export const RECENT_ACTIVITY = [
  {
    id: '1',
    type: 'exam_scheduled',
    title: 'Mathematics Final Exam Scheduled',
    description: 'Exam scheduled for Dec 20, 2024 at 10:00 AM',
    time: '2 hours ago',
    icon: 'calendar-check',
    color: '#7c3aed',
  },
  {
    id: '2',
    type: 'evaluation_completed',
    title: 'Physics Mid-term Evaluated',
    description: 'All 150 papers evaluated and grades uploaded',
    time: '4 hours ago',
    icon: 'check-circle',
    color: '#10b981',
  },
  {
    id: '3',
    type: 'cheating_detected',
    title: 'Cheating Alert Generated',
    description: 'AI detected suspicious activity in Chemistry exam',
    time: '6 hours ago',
    icon: 'shield-halved',
    color: '#ef4444',
  },
  {
    id: '4',
    type: 'timetable_generated',
    title: 'Auto Timetable Generated',
    description: 'New timetable generated for Semester 3',
    time: '1 day ago',
    icon: 'robot',
    color: '#8b5cf6',
  },
];
