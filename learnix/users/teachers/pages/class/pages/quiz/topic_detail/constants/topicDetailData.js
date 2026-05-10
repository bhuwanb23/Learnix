export const QUIZ_STATS = [
    {
        id: 'stat-1',
        label: 'Active Quizzes',
        value: '12',
        subtitle: '4 Ending this week',
        icon: 'quiz',
        iconBg: 'rgba(0, 80, 212, 0.1)',
        iconColor: '#0050d4',
    },
    {
        id: 'stat-2',
        label: 'Completion Rate',
        value: '92.4%',
        subtitle: 'Higher than average',
        icon: 'task-alt',
        iconBg: 'rgba(112, 42, 225, 0.1)',
        iconColor: '#702ae1',
    },
    {
        id: 'stat-3',
        label: 'Top Score',
        value: '98/100',
        subtitle: 'Data Structures Quiz',
        icon: 'military-tech',
        iconBg: 'rgba(162, 56, 0, 0.1)',
        iconColor: '#a23800',
    },
];

export const QUIZZES = [
    {
        id: 'quiz-1',
        name: 'Modern Architecture Basics',
        modified: 'Modified 2h ago',
        status: 'Live',
        statusColor: '#702ae1',
        statusBg: 'rgba(220, 201, 255, 1)',
        statusTextColor: '#5b00c7',
        submissions: '45/48',
        avgScore: 78,
        avgScoreColor: '#0050d4',
    },
    {
        id: 'quiz-2',
        name: 'Introduction to UX Research',
        modified: 'Modified yesterday',
        status: 'Draft',
        statusColor: '#595c5e',
        statusBg: '#d9dde0',
        statusTextColor: '#595c5e',
        submissions: '-',
        avgScore: null,
        avgScoreColor: null,
    },
    {
        id: 'quiz-3',
        name: 'Principles of Color Theory',
        modified: 'Modified 3d ago',
        status: 'Completed',
        statusColor: '#702ae1',
        statusBg: 'rgba(220, 201, 255, 1)',
        statusTextColor: '#5b00c7',
        submissions: '12/12',
        avgScore: 92,
        avgScoreColor: '#702ae1',
    },
];

export const HEADER = {
    title: 'Quiz Dashboard',
    performanceTitle: 'Performance Overview',
    performanceSubtitle: 'Class Performance',
    performanceValue: '84%',
    performanceTrend: '+12% this month',
};

export const AI_INSIGHT = {
    label: 'SMART INSIGHT',
    title: 'Refine Learning Paths',
    content: 'Data from recent submissions shows students are struggling with',
    highlight1: 'Recursion logic',
    highlight2: 'Big O notation',
    suggestion: 'Consider creating a targeted quiz for these areas.',
    buttonText: 'Generate Specialized Quiz',
    icon: 'psychology',
};
