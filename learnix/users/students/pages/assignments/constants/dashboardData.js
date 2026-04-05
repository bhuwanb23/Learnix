// Assignment page data matching assignment.html prototype

export const weeklyVelocity = {
  percentage: 84,
  trend: '+12% vs last week',
  chart: [40, 60, 35, 85, 75, 55, 90], // Bar heights for graph
};

export const subjectAllocation = {
  totalTasks: 14,
  categories: [
    { name: 'STEM', color: '#0050d4' },
    { name: 'Arts', color: '#702ae1' },
  ],
};

export const statsCards = [
  {
    id: 'due-today',
    value: '03',
    label: 'Due Today',
    icon: 'alarm',
    color: '#0050d4',
    bgColor: 'rgba(0, 80, 212, 0.1)',
  },
  {
    id: 'completed',
    value: '28',
    label: 'Completed',
    icon: 'check_circle',
    color: '#702ae1',
    bgColor: 'rgba(112, 42, 225, 0.1)',
  },
  {
    id: 'avg-grade',
    value: '3.8',
    label: 'Avg Grade',
    icon: 'star',
    color: '#a23800',
    bgColor: 'rgba(162, 56, 0, 0.1)',
  },
  {
    id: 'in-review',
    value: '12',
    label: 'In Review',
    icon: 'pending_actions',
    color: '#0050d4',
    bgColor: 'rgba(0, 80, 212, 0.1)',
  },
];

export const assignments = [
  {
    id: 1,
    title: 'Multivariable Integration Project',
    subject: 'Calculus III • Dr. Aris',
    priority: 'Urgent',
    priorityColor: '#a23800',
    priorityBg: '#ffefeb',
    timeLeft: '4h left',
    files: 2,
    progress: 90,
    progressColor: '#a23800',
  },
  {
    id: 2,
    title: 'Wave-Particle Duality Essay',
    subject: 'Quantum Mechanics • Prof. Schmidt',
    priority: 'Physics',
    priorityColor: '#0050d4',
    priorityBg: 'rgba(123, 156, 255, 0.2)',
    dueDate: 'Oct 24',
    teamTask: true,
    progress: 15,
    progressColor: '#0050d4',
  },
];

export const recentCompletions = [
  {
    id: 1,
    subject: 'Art History',
    grade: '98%',
    title: 'Modernism in Berlin',
    feedback: '"Excellent depth in your analysis of the Bauhaus influence. Try to expand on the socio-political context."',
    suggestion: 'Review 1920s Weimar history',
    suggestionIcon: 'lightbulb',
    borderColor: '#702ae1',
  },
  {
    id: 2,
    subject: 'Data Science',
    grade: '85%',
    title: 'Neural Network Optimizers',
    feedback: '"Strong implementation of SGD. Accuracy could be improved by tuning the learning rate decay."',
    suggestion: 'Hyperparameter Tuning',
    suggestionIcon: 'trending_up',
    borderColor: '#0050d4',
  },
];
