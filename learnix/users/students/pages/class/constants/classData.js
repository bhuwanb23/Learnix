// Mock data for class page components

export const mockTodaySchedule = {
  totalClasses: 5,
  pendingTests: 2,
  nextClass: {
    subject: 'Physics',
    time: '10:30 AM',
  },
};

export const mockQuickActions = [
  {
    id: 'notes',
    title: 'Notes',
    icon: 'book-outline',
    backgroundColor: '#DBEAFE',
    iconColor: '#2563EB',
  },
  {
    id: 'quizzes',
    title: 'Quizzes',
    icon: 'help-circle-outline',
    backgroundColor: '#DCFCE7',
    iconColor: '#16A34A',
  },
  {
    id: 'weak-topics',
    title: 'Weak Topics',
    icon: 'warning-outline',
    backgroundColor: '#FEE2E2',
    iconColor: '#DC2626',
  },
  {
    id: 'syllabus-tracker',
    title: 'Syllabus Tracker',
    icon: 'list-outline',
    backgroundColor: '#F3E8FF',
    iconColor: '#9333EA',
  },
];

export const mockSubjects = [
  {
    id: 'physics',
    name: 'Physics',
    chapter: 'Chapter 12',
    progress: 78,
    icon: 'nuclear-outline',
    backgroundColor: '#DBEAFE',
    iconColor: '#2563EB',
    progressColor: '#2563EB',
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    chapter: 'Calculus',
    progress: 92,
    icon: 'calculator-outline',
    backgroundColor: '#DCFCE7',
    iconColor: '#16A34A',
    progressColor: '#16A34A',
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    chapter: 'Organic Chemistry',
    progress: 65,
    icon: 'flask-outline',
    backgroundColor: '#F3E8FF',
    iconColor: '#9333EA',
    progressColor: '#9333EA',
  },
];

export const mockUpcomingTests = [
  {
    id: 'physics-test',
    subject: 'Physics Unit Test',
    date: 'Tomorrow, 9:00 AM',
    priority: 'high',
    priorityColor: '#EF4444',
    priorityBg: '#FEE2E2',
    priorityText: 'High Priority',
  },
  {
    id: 'math-quiz',
    subject: 'Math Quiz',
    date: 'Friday, 2:00 PM',
    priority: 'medium',
    priorityColor: '#F59E0B',
    priorityBg: '#FEF3C7',
    priorityText: 'Medium',
  },
];

export const mockPendingTopics = [
  {
    id: 'electromagnetic-induction',
    title: 'Electromagnetic Induction',
    subject: 'Physics',
  },
  {
    id: 'differential-equations',
    title: 'Differential Equations',
    subject: 'Mathematics',
  },
  {
    id: 'organic-reactions',
    title: 'Organic Reactions',
    subject: 'Chemistry',
  },
];

export const mockAIRecommendations = [
  {
    id: 'chemistry-weak',
    title: 'Chemistry - Weak Topic Alert',
    description: 'Spend 30 mins on Organic Reactions',
    type: 'weak-topic',
  },
  {
    id: 'physics-practice',
    title: 'Physics Practice',
    description: 'Take 5 more MCQs on Electromagnetic Induction',
    type: 'practice',
  },
];

// Priority levels for tests
export const TEST_PRIORITIES = {
  high: {
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
    text: 'High Priority',
  },
  medium: {
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    text: 'Medium',
  },
  low: {
    color: '#10B981',
    backgroundColor: '#D1FAE5',
    text: 'Low',
  },
};

// Quick action types
export const QUICK_ACTION_TYPES = {
  NOTES: 'notes',
  QUIZZES: 'quizzes',
  WEAK_TOPICS: 'weak-topics',
  SYLLABUS_TRACKER: 'syllabus-tracker',
};
