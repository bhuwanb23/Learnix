export const QUIZ_ATTEMPT_COLORS = {
  primary: '#0050d4',
  primaryDim: '#0046bb',
  primaryContainer: '#7b9cff',
  secondary: '#702ae1',
  secondaryContainer: '#dcc9ff',
  surface: '#f5f7f9',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eef1f3',
  surfaceContainerHigh: '#dfe3e6',
  surfaceContainer: '#e5e9eb',
  onSurface: '#2c2f31',
  onSurfaceVariant: '#595c5e',
  outlineVariant: '#abadaf',
};

export const QUIZ_ATTEMPT_DATA = {
  unitTitle: 'Unit 4: Advanced Calculus',
  currentQuestion: 14,
  totalQuestions: 25,
  timeRemaining: '12:45',
};

export const SAMPLE_QUESTION = {
  id: 14,
  text: 'Evaluate the integral of e^(2x) from 0 to 1.',
  options: [
    {
      id: 'A',
      text: '(e² - 1) / 2',
      isSelected: false,
    },
    {
      id: 'B',
      text: 'e² - 1',
      isSelected: true,
    },
    {
      id: 'C',
      text: 'e² / 2',
      isSelected: false,
    },
    {
      id: 'D',
      text: '(e² + 1) / 2',
      isSelected: false,
    },
  ],
  isFlagged: false,
  hasHint: true,
};
