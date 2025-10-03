// Exam data constants
export const EXAM_STATUS = {
  UPCOMING: 'upcoming',
  COMPLETED: 'completed',
  PRACTICE: 'practice'
};

export const EXAM_TYPE = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  PRACTICE: 'practice'
};

export const EXAM_TABS = [
  { id: 'overview', title: 'Overview' },
  { id: 'schedule', title: 'Schedule' },
  { id: 'practice', title: 'Practice' },
  { id: 'results', title: 'Results' }
];

export const MOCK_EXAMS = {
  upcoming: [
    {
      id: '1',
      title: 'Mathematics',
      subject: 'Advanced Calculus',
      date: '2025-01-15',
      time: '2 hours',
      type: EXAM_TYPE.ONLINE,
      status: EXAM_STATUS.UPCOMING,
      canStart: true,
      instructions: 'Complete all questions within the given time limit. No external resources allowed.'
    },
    {
      id: '2',
      title: 'Physics',
      subject: 'Quantum Mechanics',
      date: '2025-01-18',
      time: '3 hours',
      type: EXAM_TYPE.OFFLINE,
      status: EXAM_STATUS.UPCOMING,
      canStart: false,
      instructions: 'Bring pencils, calculator, and ID. Room 201.'
    }
  ],
  completed: [
    {
      id: '3',
      title: 'Chemistry Final',
      subject: 'Organic Chemistry',
      completedDate: '2024-12-10',
      score: 92,
      maxScore: 100,
      status: EXAM_STATUS.COMPLETED,
      grade: 'A+',
      feedback: 'Excellent work! Strong understanding of organic reactions.',
      strengths: ['Organic Chemistry', 'Reaction Mechanisms'],
      weaknesses: ['Physical Chemistry', 'Thermodynamics']
    },
    {
      id: '4',
      title: 'Biology Midterm',
      subject: 'Cell Biology',
      completedDate: '2024-12-08',
      score: 78,
      maxScore: 100,
      status: EXAM_STATUS.COMPLETED,
      grade: 'B+',
      feedback: 'Good understanding of most concepts. Focus more on cellular respiration.',
      strengths: ['Genetics', 'Molecular Biology'],
      weaknesses: ['Cell Biology', 'Metabolism']
    }
  ],
  practiceTests: [
    {
      id: '5',
      type: 'mcq',
      title: 'MCQ Practice',
      description: 'Quick multiple choice questions to test your knowledge',
      subjects: ['Math', 'Physics', 'Chemistry', 'Biology'],
      icon: 'brain',
      color: '#7C3AED'
    },
    {
      id: '6',
      type: 'timed',
      title: 'Timed Mock Test',
      description: 'Full exam simulation with time constraints',
      duration: '2 hours',
      icon: 'stopwatch',
      color: '#059669'
    }
  ],
  schedule: [
    {
      date: '2024-12-15',
      type: EXAM_TYPE.ONLINE,
      exams: ['Mathematics - Advanced Calculus'],
      color: '#4F46E5'
    },
    {
      date: '2024-12-18',
      type: EXAM_TYPE.OFFLINE,
      exams: ['Physics - Quantum Mechanics'],
      color: '#2563EB'
    },
    {
      date: '2024-12-22',
      type: EXAM_TYPE.PRACTICE,
      exams: ['Chemistry - Final Review'],
      color: '#059669'
    }
  ]
};

export const PRACTICE_CATEGORIES = [
  {
    id: 'mcq',
    title: 'MCQ Practice',
    description: 'Quick multiple choice questions to test your knowledge',
    icon: 'brain',
    color: '#7C3AED',
    subjects: ['Math', 'Physics', 'Chemistry', 'Biology']
  },
  {
    id: 'timed',
    title: 'Timed Mock Tests',
    description: 'Full exam simulation with time constraints',
    icon: 'stopwatch',
    color: '#059669',
    duration: '2 hours'
  },
  {
    id: 'analytics',
    title: 'Performance Analytics',
    description: 'Track your progress and identify weak areas',
    icon: 'chart-line',
    color: '#2563EB',
    features: ['Progress Tracking', 'Weak Area Analysis', 'Performance Trends']
  }
];

export const STUDENT_STATS = {
  upcomingCount: 3,
  completedCount: 12,
  averageScore: 85.2,
  totalExams: 15,
  topSubjects: ['Chemistry', 'Biology', 'Physics'],
  improvementAreas: ['Mathematics', 'Calculus']
};

export const getExamTypeConfig = (type) => {
  switch (type) {
    case EXAM_TYPE.ONLINE:
      return {
        label: 'Online',
        badgeColor: '#FEF3C7',
        textColor: '#D97706'
      };
    case EXAM_TYPE.OFFLINE:
      return {
        label: 'Offline',
        badgeColor: '#DBEAFE',
        textColor: '#2563EB'
      };
    case EXAM_TYPE.PRACTICE:
      return {
        label: 'Practice',
        badgeColor: '#D1FAE5',
        textColor: '#059669'
      };
    default:
      return {
        label: 'Unknown',
        badgeColor: '#F3F4F6',
        textColor: '#6B7280'
      };
  }
};

export const getScoreColor = (score) => {
  if (score >= 90) return '#059669'; // Green for A
  if (score >= 80) return '#2563EB'; // Blue for B
  if (score >= 70) return '#EA580C'; // Orange for C
  return '#DC2626'; // Red for D/F
};

export const getGradeConfig = (score) => {
  if (score >= 90) return { grade: 'A+', color: '#059669', label: 'Excellent' };
  if (score >= 80) return { grade: 'A-', color: '#2563EB', label: 'Good' };
  if (score >= 70) return { grade: 'B+', color: '#EA580C', label: 'Fair' };
  return { grade: 'C', color: '#DC2626', label: 'Needs Improvement' };
};

export const CALENDAR_DATA = {
  month: 'January 2025',
  weeks: [
    {
      days: [
        { day: 1, isCurrentMonth: false },
        { day: 2, isCurrentMonth: true },
        { day: 3, isCurrentMonth: true },
        { day: 4, isCurrentMonth: true },
        { day: 5, isCurrentMonth: true },
        { day: 6, isCurrentMonth: true },
        { day: 7, isCurrentMonth: true }
      ]
    },
    {
      days: [
        { day: 8, isCurrentMonth: true, events: [{ type: EXAM_TYPE.COMPLETED }] },
        { day: 9, isCurrentMonth: true },
        { day: 10, isCurrentMonth: true, events: [{ type: EXAM_TYPE.COMPLETED }] },
        { day: 11, isCurrentMonth: true },
        { day: 12, isCurrentMonth: true },
        { day: 13, isCurrentMonth: true },
        { day: 14, isCurrentMonth: true }
      ]
    },
    {
      days: [
        { day: 15, isCurrentMonth: true, events: [{ type: EXAM_TYPE.ONLINE }] },
        { day: 16, isCurrentMonth: true },
        { day: 17, isCurrentMonth: true },
        { day: 18, isCurrentMonth: true, events: [{ type: EXAM_TYPE.OFFLINE }] },
        { day: 19, isCurrentMonth: true },
        { day: 20, isCurrentMonth: true },
        { day: 21, isCurrentMonth: true }
      ]
    },
    {
      days: [
        { day: 22, isCurrentMonth: true, events: [{ type: EXAM_TYPE.PRACTICE }] },
        { day: 23, isCurrentMonth: true },
        { day: 24, isCurrentMonth: true },
        { day: 25, isCurrentMonth: true },
        { day: 26, isCurrentMonth: true },
        { day: 27, isCurrentMonth: true },
        { day: 28, isCurrentMonth: true }
      ]
    }
  ]
};
