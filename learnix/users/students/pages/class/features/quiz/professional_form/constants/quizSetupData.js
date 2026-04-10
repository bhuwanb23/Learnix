export const QUIZ_SETUP_COLORS = {
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
  surfaceContainerHighest: '#d9dde0',
  surfaceContainer: '#e5e9eb',
  onSurface: '#2c2f31',
  onSurfaceVariant: '#595c5e',
  outlineVariant: '#abadaf',
  outline: '#747779',
};

export const QUIZ_CONFIG_DATA = {
  subject: 'Advanced Neurobiology',
  title: 'Tailor Your Learning Experience.',
  description: 'Configure your session parameters to align with your current study goals. Practice for mastery or test for precision.',
};

export const QUIZ_MODES = [
  {
    id: 'practice',
    title: 'Practice Mode',
    description: 'Unlimited time, immediate feedback after every answer, and detailed explanations for each concept.',
    icon: 'book',
    color: QUIZ_SETUP_COLORS.secondary,
    bgColor: `${QUIZ_SETUP_COLORS.secondary}1A`,
    isSelected: true,
  },
  {
    id: 'exam',
    title: 'Exam Mode',
    description: 'Simulate a real test environment. Strictly timed, no hints, and results revealed only at the end.',
    icon: 'timer',
    color: QUIZ_SETUP_COLORS.tertiary,
    bgColor: `${QUIZ_SETUP_COLORS.tertiary}1A`,
    isSelected: false,
  },
];

export const QUESTION_COUNTS = [
  { value: 5, isSelected: false },
  { value: 10, isSelected: true },
  { value: 20, isSelected: false },
];

export const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Easy', isSelected: false },
  { value: 'medium', label: 'Medium', isSelected: true },
  { value: 'hard', label: 'Hard', isSelected: false },
];

export const PERFORMANCE_TWEAKS = [
  {
    id: 'timer',
    title: 'Active Timer',
    subtitle: 'Recommended for Exam mode',
    enabled: true,
  },
  {
    id: 'focus',
    title: 'Focus Mode',
    subtitle: 'Hide UI during questions',
    enabled: false,
  },
  {
    id: 'audio',
    title: 'Audio Cues',
    subtitle: 'Sound for correct/incorrect',
    enabled: true,
  },
];
