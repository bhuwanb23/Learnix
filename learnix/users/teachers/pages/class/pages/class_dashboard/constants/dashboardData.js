export const DASHBOARD_STATS = [
    { label: 'Attendance', value: '94%', change: '+2%', changeColor: '#22c55e', progress: 0.94, progressColor: '#0050d4' },
    { label: 'Avg Grade', value: '82.5', change: '/ 100', changeColor: '#94a3b8', progress: 0.825, progressColor: '#702ae1' },
    { label: 'Pending Grading', value: '14', change: '4 assignments due soon', changeColor: '#595c5e' },
    { label: 'Active Quizzes', value: '03', change: 'Ends in 2 days', changeColor: '#595c5e' },
];

export const QUICK_ACTIONS = [
    { label: 'Notes', icon: 'description', color: '#0050d4', bgColor: 'rgba(123, 156, 255, 0.2)' },
    { label: 'Quizzes', icon: 'quiz', color: '#702ae1', bgColor: 'rgba(220, 201, 255, 0.2)' },
    { label: 'Syllabus', icon: 'calendar-today', color: '#a23800', bgColor: 'rgba(255, 149, 106, 0.2)' },
    { label: 'Roster', icon: 'group', color: '#595c5e', bgColor: 'rgba(89, 92, 94, 0.1)' },
];

export const DAYS_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const AI_INSIGHT = {
    title: 'AI Teaching Insights',
    icon: 'auto-awesome',
    content: 'Recent data suggests a performance gap in "Pre-frontal Cortex Functions". 62% of students missed the correlation question in last night\'s quiz. Recommend a 10-minute recap during tomorrow\'s lecture.',
    highlight: 'Pre-frontal Cortex Functions',
    actions: [
        { label: 'Add to tomorrow\'s slides', type: 'primary' },
        { label: 'Dismiss', type: 'secondary' },
    ],
};
