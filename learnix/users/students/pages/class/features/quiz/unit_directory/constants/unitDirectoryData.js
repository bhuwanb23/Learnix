export const UNIT_DIRECTORY_COLORS = {
  primary: '#0050d4',
  primaryDim: '#0046bb',
  primaryContainer: '#7b9cff',
  secondary: '#702ae1',
  secondaryDim: '#6411d5',
  secondaryContainer: '#dcc9ff',
  tertiary: '#a23800',
  tertiaryDim: '#8e3000',
  tertiaryContainer: '#ff956a',
  surface: '#f5f7f9',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eef1f3',
  surfaceContainerHigh: '#dfe3e6',
  surfaceContainer: '#e5e9eb',
  onSurface: '#2c2f31',
  onSurfaceVariant: '#595c5e',
  outlineVariant: '#abadaf',
  outline: '#747779',
};

export const SUBJECT_DETAIL_DATA = {
  id: 'math',
  title: 'Advanced Mathematics',
  mastery: 78,
  description: 'Master the entire curriculum with our comprehensive final evaluation. Tracks all key competencies.',
};

export const UNITS_DATA = [
  {
    id: 'unit-01',
    number: '01',
    title: 'Linear Algebra',
    topics: 12,
    duration: '45 min',
    status: 'Completed',
    statusColor: UNIT_DIRECTORY_COLORS.secondary,
  },
  {
    id: 'unit-02',
    number: '02',
    title: 'Calculus',
    topics: 18,
    duration: '60 min',
    status: 'In Progress',
    statusColor: UNIT_DIRECTORY_COLORS.tertiary,
  },
  {
    id: 'unit-03',
    number: '03',
    title: 'Probability',
    topics: 10,
    duration: '35 min',
    status: 'Locked',
    statusColor: `${UNIT_DIRECTORY_COLORS.onSurface}40`,
  },
];

export const STATS_DATA = [
  {
    id: 'rank',
    icon: 'star',
    label: 'Top Rank',
    value: '94th',
    description: 'Percentile in Advanced Math',
    color: UNIT_DIRECTORY_COLORS.secondary,
  },
  {
    id: 'streak',
    icon: 'flame',
    label: 'Daily Streak',
    value: '12 Days',
    description: 'Consistent learning progress',
    color: UNIT_DIRECTORY_COLORS.primary,
  },
  {
    id: 'practice',
    icon: 'time',
    label: 'Total Practice',
    value: '18.5h',
    description: 'Time spent in subject quizzes',
    color: UNIT_DIRECTORY_COLORS.tertiary,
  },
];
