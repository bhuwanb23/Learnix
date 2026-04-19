// Data constants for Assignment & Exams page - Academic Curator

export const HEADER = {
  title: 'Academic Curator',
};

export const HERO = {
  title: 'Submission Velocity',
  subtitle: 'Real-time engagement across your active academic modules.',
  legend: [
    { label: 'Low', color: '#fb5151' },
    { label: 'Mid', color: '#ff956a' },
    { label: 'High', color: '#dcc9ff' },
  ],
  stats: [
    { label: 'Global Avg.', value: '88.4%', color: '#0050d4' },
    { label: 'Active Submissions', value: '1,240', color: '#702ae1' },
  ],
  heatmap: [
    // Row 1
    { engagement: 'high' }, { engagement: 'mid' }, { engagement: 'high' }, { engagement: 'low' },
    { engagement: 'low' }, { engagement: 'mid' }, { engagement: 'high' }, { engagement: 'high' },
    // Row 2
    { engagement: 'mid' }, { engagement: 'high' }, { engagement: 'low' }, { engagement: 'mid' },
    { engagement: 'low' }, { engagement: 'high' }, { engagement: 'high' }, { engagement: 'mid' },
  ],
};

export const MODULES = [
  {
    id: 'calculus',
    title: 'Advanced Calculus',
    description: 'Differential Equations & Multi-variable integration.',
    icon: 'functions',
    iconColor: '#0050d4',
    iconBg: '#0050d41a',
    activeCount: 3,
    nextDeadline: 'Problem Set #04',
    deadlineDate: 'Oct 12',
    engagement: 92,
    engagementColor: '#0050d4',
  },
  {
    id: 'physics',
    title: 'Theoretical Physics',
    description: 'Electromagnetism and Thermodynamic cycles.',
    icon: 'science',
    iconColor: '#702ae1',
    iconBg: '#702ae11a',
    activeCount: 1,
    nextDeadline: 'Lab Report: Optics',
    deadlineDate: 'Oct 14',
    engagement: 76,
    engagementColor: '#702ae1',
  },
];

export const QUICK_TOOLS = [
  {
    id: 'create',
    title: 'Create Template',
    subtitle: 'Deploy a new structured assignment across all classes.',
    icon: 'add-box',
    gradient: true,
    color: '#0050d4',
  },
  {
    id: 'export',
    title: 'Export Grades',
    subtitle: 'Generate CSV/PDF reports for the current semester.',
    icon: 'file-export',
    gradient: false,
    color: '#702ae1',
  },
];

export const ALERTS = [
  {
    id: 'alert1',
    title: 'Low submission rate in Physics',
    subtitle: 'Last activity: 4h ago',
    color: '#b31b25',
  },
  {
    id: 'alert2',
    title: 'Grade dispute: Problem Set #03',
    subtitle: '2 pending reviews',
    color: '#a23800',
  },
];


