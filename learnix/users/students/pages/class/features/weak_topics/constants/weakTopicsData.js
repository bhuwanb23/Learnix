export const WEAK_TOPICS_DATA = {
  alerts: [
    {
      id: 'physics-exam',
      type: 'critical',
      title: 'Attention Required',
      message: 'Physics exam in 3 days - 2 weak topics identified',
      icon: 'warning-outline',
    },
  ],
  
  performance: {
    overallScore: 87,
    improvement: 12,
    rank: 15,
    streak: 7,
    studyTime: 4.2,
  },
  
  stats: [
    {
      id: 'rank',
      label: 'Rank',
      value: '15th',
      icon: 'trophy-outline',
      color: '#F59E0B',
    },
    {
      id: 'streak',
      label: 'Streak',
      value: '7 days',
      icon: 'flame-outline',
      color: '#F97316',
    },
    {
      id: 'study-time',
      label: 'Study Time',
      value: '4.2h',
      icon: 'time-outline',
      color: '#3B82F6',
    },
  ],
  
  heatmapData: {
    subjects: ['Math', 'Physics', 'Chemistry', 'Biology'],
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data: [
      // Math
      [92, 88, 90, 85, 94, 89, 91],
      // Physics
      [58, 62, 55, 60, 65, 59, 63],
      // Chemistry
      [74, 78, 72, 76, 80, 75, 77],
      // Biology
      [82, 85, 80, 83, 87, 84, 86],
    ],
  },
  
  subjects: [
    {
      id: 'mathematics',
      name: 'Mathematics',
      accuracy: 92,
      status: 'strong',
      color: '#22C55E',
      bgColor: '#F0FDF4',
      borderColor: '#BBF7D0',
      weakTopics: [],
    },
    {
      id: 'chemistry',
      name: 'Chemistry',
      accuracy: 74,
      status: 'average',
      color: '#EAB308',
      bgColor: '#FEFCE8',
      borderColor: '#FEF08A',
      weakTopics: [
        'Organic Chemistry',
        'Chemical Bonding',
      ],
    },
    {
      id: 'physics',
      name: 'Physics',
      accuracy: 58,
      status: 'weak',
      color: '#EF4444',
      bgColor: '#FEF2F2',
      borderColor: '#FECACA',
      weakTopics: [
        'Thermodynamics',
        'Optics',
        'Wave Motion',
      ],
    },
  ],
  
  aiRecommendations: [
    {
      id: 'weak-topics',
      title: 'Revise 3 weak topics',
      description: 'Focus on Thermodynamics, Optics, and Waves',
      priority: 'high',
      priorityColor: '#EF4444',
      estimatedTime: '2 hours',
    },
    {
      id: 'practice-problems',
      title: 'Practice 20 problems',
      description: 'Complete Physics problem sets 15-17',
      priority: 'medium',
      priorityColor: '#F59E0B',
      estimatedTime: '1.5 hours',
    },
    {
      id: 'video-lessons',
      title: 'Watch video lessons',
      description: 'Review fundamental concepts',
      priority: 'low',
      priorityColor: '#10B981',
      estimatedTime: '45 minutes',
    },
  ],
  
  studyResources: [
    {
      id: 'physics-fundamentals',
      title: 'Physics Fundamentals',
      description: 'Thermodynamics explained simply',
      type: 'video',
      duration: '15 min video',
      icon: 'play-circle-outline',
      iconColor: '#EF4444',
      iconBg: '#FEE2E2',
      url: 'https://youtube.com/watch?v=example1',
    },
    {
      id: 'interactive-practice',
      title: 'Interactive Practice',
      description: 'Wave motion simulations',
      type: 'practice',
      duration: 'Practice set',
      icon: 'book-outline',
      iconColor: '#22C55E',
      iconBg: '#DCFCE7',
      url: 'https://example.com/practice',
    },
    {
      id: 'study-guide',
      title: 'Optics Study Guide',
      description: 'Complete guide with examples',
      type: 'guide',
      duration: '30 min read',
      icon: 'document-text-outline',
      iconColor: '#3B82F6',
      iconBg: '#DBEAFE',
      url: 'https://example.com/guide',
    },
  ],
  
  quickActions: [
    {
      id: 'start-study',
      title: 'Start Study',
      icon: 'play-outline',
      color: '#3B82F6',
      action: 'START_STUDY',
    },
    {
      id: 'view-progress',
      title: 'View Progress',
      icon: 'bar-chart-outline',
      color: '#22C55E',
      action: 'VIEW_PROGRESS',
    },
    {
      id: 'ai-tutor',
      title: 'AI Tutor',
      icon: 'bulb-outline',
      color: '#8B5CF6',
      action: 'AI_TUTOR',
    },
    {
      id: 'study-group',
      title: 'Study Group',
      icon: 'people-outline',
      color: '#F97316',
      action: 'STUDY_GROUP',
    },
  ],
};

export const QUICK_ACTION_TYPES = {
  START_STUDY: 'start-study',
  VIEW_PROGRESS: 'view-progress',
  AI_TUTOR: 'ai-tutor',
  STUDY_GROUP: 'study-group',
};
