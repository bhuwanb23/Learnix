// Lecture Notes data constants

export const FILTER_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'core', label: 'Core' },
  { id: 'electives', label: 'Electives' },
  { id: 'archived', label: 'Archived' },
];

export const CONTINUE_STUDYING = {
  id: 'os-101',
  title: 'Operating Systems',
  progress: 80,
  completedModules: 4,
  totalModules: 5,
};

export const SUBJECTS = [
  {
    id: 'ads-201',
    title: 'Algorithms & Data Structures',
    type: 'Core',
    progress: 65,
    lastOpened: 'Oct 14',
    icon: 'data-object',
    iconColor: '#702ae1',
    iconBgColor: 'rgba(220, 201, 255, 0.3)',
    accentColor: '#702ae1',
  },
  {
    id: 'dbm-301',
    title: 'Database Management',
    type: 'Core',
    progress: 42,
    lastOpened: 'Oct 12',
    icon: 'database',
    iconColor: '#a23800',
    iconBgColor: 'rgba(255, 149, 106, 0.3)',
    accentColor: '#a23800',
  },
  {
    id: 'uiux-401',
    title: 'UI/UX Design Systems',
    type: 'Elective',
    progress: 95,
    lastOpened: 'Oct 10',
    icon: 'brush',
    iconColor: '#0050d4',
    iconBgColor: 'rgba(123, 156, 255, 0.3)',
    accentColor: '#0050d4',
  },
];

export const COLORS = {
  primary: '#0050d4',
  primaryDim: '#0046bb',
  primaryContainer: '#7b9cff',
  secondary: '#702ae1',
  secondaryContainer: '#dcc9ff',
  tertiary: '#a23800',
  tertiaryContainer: '#ff956a',
  surface: '#f5f7f9',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eef1f3',
  surfaceContainer: '#e5e9eb',
  onSurface: '#2c2f31',
  onSurfaceVariant: '#595c5e',
  outlineVariant: '#abadaf',
};
