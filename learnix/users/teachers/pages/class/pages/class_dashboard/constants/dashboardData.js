export const HEADER = {
  title: 'Advanced Cognitive Psychology',
};

export const HERO = {
  badge: 'Upcoming Session',
  title: 'Next Lecture: Tomorrow, 10:00 AM',
  topic: 'Topic: Neural Plasticity and Memory Consolidation in Adult Learners.',
};

export const STATS = [
  {
    id: 'attendance',
    label: 'Attendance',
    value: '94%',
    trend: '+2%',
    trendColor: '#16a34a',
    progress: 94,
    progressColor: '#0050d4',
  },
  {
    id: 'avgGrade',
    label: 'Avg Grade',
    value: '82.5',
    suffix: '/ 100',
    progress: 82.5,
    progressColor: '#702ae1',
  },
  {
    id: 'pendingGrading',
    label: 'Pending Grading',
    value: '14',
    note: '4 assignments due soon',
    color: '#a23800',
  },
  {
    id: 'activeQuizzes',
    label: 'Active Quizzes',
    value: '03',
    note: 'Ends in 2 days',
    color: '#2c2f31',
  },
];

export const QUICK_ACTIONS = [
  {
    id: 'notes',
    icon: 'description',
    label: 'Notes',
    iconColor: '#0050d4',
    bgColor: '#7b9cff4d',
  },
  {
    id: 'quizzes',
    icon: 'quiz',
    label: 'Quizzes',
    iconColor: '#702ae1',
    bgColor: '#dcc9ff4d',
  },
  {
    id: 'syllabus',
    icon: 'calendar-month',
    label: 'Syllabus',
    iconColor: '#a23800',
    bgColor: '#ff956a4d',
  },
  {
    id: 'roster',
    icon: 'group',
    label: 'Roster',
    iconColor: '#595c5e',
    bgColor: '#595c5e1a',
  },
];

export const CLASS_PULSE = {
  title: 'Class Pulse',
  legend: [
    { label: 'Engagement', color: '#0050d4' },
    { label: 'Previous Week', color: '#cbd5e1' },
  ],
  days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
  // Simulated graph points (0-100)
  data: [80, 20, 50, 30, 60, 10, 90],
};

export const AI_INSIGHT = {
  icon: 'auto_awesome',
  title: 'AI Teaching Insights',
  content:
    'Recent data suggests a performance gap in "Pre-frontal Cortex Functions". 62% of students missed the correlation question in last night\'s quiz. Recommend a 10-minute recap during tomorrow\'s lecture.',
  actions: [
    { label: "Add to tomorrow's slides", color: '#702ae1' },
    { label: 'Dismiss', color: '#595c5e' },
  ],
};
