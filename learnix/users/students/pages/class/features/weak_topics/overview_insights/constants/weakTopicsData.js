export const WEAK_TOPICS_COLORS = {
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
  surfaceContainerHigh: '#dfe3e6',
  surfaceContainer: '#e5e9eb',
  onSurface: '#2c2f31',
  onSurfaceVariant: '#595c5e',
  outlineVariant: '#abadaf',
  errorContainer: '#fb5151',
  onErrorContainer: '#570008',
  error: '#b31b25',
};

export const STATS_DATA = {
  avgScore: 84,
  scoreTrend: '+5.2% from last week',
  attempts: 12,
  attemptsNote: 'Across 4 modules',
  topScore: 98,
  topScoreSubject: 'Advanced Calculus',
};

export const GAPS_DATA = [
  {
    id: 'gap-1',
    severity: 'Critical Gap',
    conceptId: 'Concept #402',
    title: 'Asymmetric Data Encryption',
    description: 'You consistently confuse the role of public vs private keys in the signature verification process. Remember: Private keys sign, public keys verify.',
    mastery: 40,
    severityColor: WEAK_TOPICS_COLORS.errorContainer,
    severityTextColor: WEAK_TOPICS_COLORS.onErrorContainer,
    progressColor: WEAK_TOPICS_COLORS.error,
    actionText: 'Review 12-page whitepaper snippet',
    actionIcon: 'arrow-forward',
  },
  {
    id: 'gap-2',
    severity: 'Moderate Gap',
    conceptId: 'Concept #119',
    title: 'Big O Notation: Space Complexity',
    description: 'While time complexity is understood, you\'re missing the auxiliary space overhead in recursive calls. Focus on stack frame allocation.',
    mastery: 65,
    severityColor: WEAK_TOPICS_COLORS.tertiaryContainer,
    severityTextColor: WEAK_TOPICS_COLORS.onTertiaryContainer,
    progressColor: WEAK_TOPICS_COLORS.tertiary,
    actionText: 'Watch 5min Visual Recap',
    actionIcon: 'play-circle',
  },
];

export const TIMELINE_DATA = [
  {
    id: 1,
    time: 'Today, 10:45 AM',
    title: 'Quiz Completed',
    description: 'Unit 4: Cybersecurity Fundamentals. Scored 82%.',
    isActive: true,
  },
  {
    id: 2,
    time: 'Yesterday',
    title: 'Gap Identified',
    description: 'System flagged "Recursion" as a weakness area.',
    isActive: false,
  },
  {
    id: 3,
    time: 'Oct 24, 2023',
    title: 'New Milestone',
    description: 'Completed "Intro to Algorithms" with Honors.',
    isActive: false,
  },
];

export const STUDY_TIP = {
  title: 'Study Tip',
  content: 'Reviewing your mistakes within 24 hours increases retention by up to 60%. Try a quick recap now.',
};

export const ACTION_CARDS = [
  {
    id: 'review-notes',
    icon: 'description',
    title: 'Review Notes',
    description: 'Personalized summaries focused exactly on your knowledge gaps.',
    color: WEAK_TOPICS_COLORS.primary,
    bgColor: `${WEAK_TOPICS_COLORS.primaryContainer}33`,
  },
  {
    id: 'practice-quiz',
    icon: 'quiz',
    title: 'Practice Quiz',
    description: 'Generate a 10-question sprint targeting your specific mistakes.',
    color: WEAK_TOPICS_COLORS.secondary,
    bgColor: `${WEAK_TOPICS_COLORS.secondaryContainer}33`,
  },
  {
    id: 'skill-booster',
    icon: 'auto-awesome',
    title: 'Skill Booster',
    description: 'Advanced AI-driven modules to push from \'Good\' to \'Expert\'.',
    color: WEAK_TOPICS_COLORS.tertiary,
    bgColor: `${WEAK_TOPICS_COLORS.tertiaryContainer}33`,
  },
];
