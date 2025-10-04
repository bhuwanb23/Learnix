import { COLORS } from '../../../../../constants/theme';

// Mock data for student performance dashboard
export const PERFORMANCE_SUMMARY = {
  attendance: {
    rate: 87.5,
    change: '+2.3%',
    icon: 'calendar-check',
    color: 'blue'
  },
  examAverage: {
    score: 78.2,
    change: '+1.8%',
    icon: 'graduation-cap',
    color: 'indigo'
  }
};

export const WEAK_TOPICS = [
  {
    id: 1,
    subject: 'Algebra',
    percentage: 32,
    color: 'red'
  },
  {
    id: 2,
    subject: 'Chemistry',
    percentage: 45,
    color: 'orange'
  },
  {
    id: 3,
    subject: 'Physics',
    percentage: 58,
    color: 'yellow'
  }
];

export const PERFORMANCE_CHART_DATA = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  data: [75, 82, 78, 85, 88]
};

export const QUICK_ACTIONS = [
  {
    id: 1,
    title: 'Class Performance',
    subtitle: 'Overall analytics',
    icon: 'users',
    color: 'purple',
    gradient: ['purple-500', 'purple-600']
  },
  {
    id: 2,
    title: 'Student Profiles',
    subtitle: 'Individual tracking',
    icon: 'user-graduate',
    color: 'emerald',
    gradient: ['emerald-500', 'emerald-600']
  },
  {
    id: 3,
    title: 'Topic Analysis',
    subtitle: 'Weakness insights',
    icon: 'chart-pie',
    color: 'orange',
    gradient: ['orange-500', 'orange-600']
  },
  {
    id: 4,
    title: 'Auto Reports',
    subtitle: 'Generated insights',
    icon: 'file-lines',
    color: 'cyan',
    gradient: ['cyan-500', 'cyan-600']
  }
];

export const RECENT_ACTIVITY = [
  {
    id: 1,
    studentName: 'Sarah Johnson',
    action: 'Submitted Math Assignment',
    timeAgo: '2m ago',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg'
  },
  {
    id: 2,
    studentName: 'Alex Chen',
    action: 'Completed Science Quiz',
    timeAgo: '5m ago',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg'
  },
  {
    id: 3,
    studentName: 'Emma Davis',
    action: 'Attended Virtual Class',
    timeAgo: '12m ago',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg'
  }
];

export const STUDENT_SEARCH_RESULTS = [
  {
    id: 1,
    name: 'Sarah Johnson',
    class: '10-A',
    attendance: 92,
    averageScore: 85,
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg'
  },
  {
    id: 2,
    name: 'Alex Chen',
    class: '10-A',
    attendance: 88,
    averageScore: 78,
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg'
  },
  {
    id: 3,
    name: 'Emma Davis',
    class: '10-A',
    attendance: 95,
    averageScore: 92,
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg'
  }
];

// Color mapping for different elements
export const COLOR_MAP = {
  blue: {
    primary: COLORS.primary,
    light: COLORS.primaryLight,
    gradient: ['#3B82F6', '#2563EB']
  },
  indigo: {
    primary: '#6366F1',
    light: '#E0E7FF',
    gradient: ['#6366F1', '#4F46E5']
  },
  purple: {
    primary: '#A855F7',
    light: '#F3E8FF',
    gradient: ['#A855F7', '#9333EA']
  },
  emerald: {
    primary: '#10B981',
    light: '#D1FAE5',
    gradient: ['#10B981', '#059669']
  },
  orange: {
    primary: '#F97316',
    light: '#FFEDD5',
    gradient: ['#F97316', '#EA580C']
  },
  cyan: {
    primary: '#06B6D4',
    light: '#CFFAFE',
    gradient: ['#06B6D4', '#0891B2']
  },
  red: {
    primary: '#EF4444',
    light: '#FEE2E2',
    gradient: ['#EF4444', '#DC2626']
  },
  yellow: {
    primary: '#FACC15',
    light: '#FEF3C7',
    gradient: ['#FACC15', '#EAB308']
  }
};
