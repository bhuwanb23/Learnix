// Quiz Arena Data Constants
export const mockUserStats = {
  level: 12,
  xp: 2450,
  weeklyProgress: 68,
  streak: 7,
  overallStats: {
    score: 89,
    accuracy: 92,
    testsCompleted: 24
  }
};

export const mockQuickActions = [
  {
    id: 'quick-test',
    title: 'Quick Test',
    subtitle: '15 questions',
    icon: 'flash-outline',
    gradient: ['#3B82F6', '#2563EB'],
    type: 'quick-test'
  },
  {
    id: 'ai-practice',
    title: 'AI Practice',
    subtitle: 'Adaptive',
    icon: 'hardware-chip-outline',
    gradient: ['#10B981', '#059669'],
    type: 'ai-practice'
  }
];

export const mockSubjects = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    icon: 'calculator-outline',
    iconColor: '#3B82F6',
    iconBg: '#DBEAFE',
    score: 94,
    lastActivity: '2 hours ago',
    progress: 94,
    progressColor: '#10B981'
  },
  {
    id: 'physics',
    name: 'Physics',
    icon: 'flask-outline',
    iconColor: '#DC2626',
    iconBg: '#FEE2E2',
    score: 76,
    lastActivity: '1 day ago',
    progress: 76,
    progressColor: '#F97316'
  },
  {
    id: 'biology',
    name: 'Biology',
    icon: 'leaf-outline',
    iconColor: '#16A34A',
    iconBg: '#DCFCE7',
    score: 68,
    lastActivity: '3 days ago',
    progress: 68,
    progressColor: '#DC2626'
  }
];

export const mockWeakTopics = [
  {
    id: 'thermodynamics',
    name: 'Thermodynamics',
    subject: 'Physics'
  },
  {
    id: 'cell-division',
    name: 'Cell Division',
    subject: 'Biology'
  }
];

export const mockLeaderboard = [
  {
    id: 'alex-chen',
    name: 'Alex Chen',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg',
    xp: 2890,
    rank: 1,
    badgeColor: '#EAB308'
  },
  {
    id: 'sarah-kim',
    name: 'Sarah Kim',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg',
    xp: 2750,
    rank: 2,
    badgeColor: '#9CA3AF'
  },
  {
    id: 'current-user',
    name: 'You',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg',
    xp: 2450,
    rank: 3,
    badgeColor: '#3B82F6',
    isCurrentUser: true
  }
];

export const mockAchievements = [
  {
    id: 'speed-master',
    title: 'Speed Master',
    description: 'Completed in 5 min',
    icon: 'medal-outline',
    gradient: ['#FEF3C7', '#FDE68A'],
    iconColor: '#EAB308',
    textColor: '#92400E'
  },
  {
    id: 'perfect-score',
    title: 'Perfect Score',
    description: '100% accuracy',
    icon: 'star-outline',
    gradient: ['#F3E8FF', '#E9D5FF'],
    iconColor: '#A855F7',
    textColor: '#6B21A8'
  },
  {
    id: 'streak-master',
    title: '7 Day Streak',
    description: 'Keep it up!',
    icon: 'flame-outline',
    gradient: ['#DCFCE7', '#BBF7D0'],
    iconColor: '#22C55E',
    textColor: '#166534'
  }
];

export const QUIZ_ACTION_TYPES = {
  QUICK_TEST: 'quick-test',
  AI_PRACTICE: 'ai-practice',
  SUBJECT_PRACTICE: 'subject-practice',
  TIMED_TEST: 'timed-test',
  WEAK_TOPIC_PRACTICE: 'weak-topic-practice'
};
