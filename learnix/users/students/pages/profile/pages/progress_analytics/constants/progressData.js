// Color constants for Progress Analytics page
export const PROGRESS_COLORS = {
    primary: '#0050d4',
    primaryDim: '#0046bb',
    primaryContainer: '#7b9cff',
    primaryFixed: '#7b9cff',
    primaryFixedDim: '#658eff',
    secondary: '#702ae1',
    secondaryContainer: '#dcc9ff',
    secondaryFixed: '#dcc9ff',
    secondaryFixedDim: '#d0b8ff',
    secondaryDim: '#6411d5',
    tertiary: '#a23800',
    tertiaryContainer: '#ff956a',
    tertiaryFixed: '#ff956a',
    tertiaryFixedDim: '#ff7e48',
    tertiaryDim: '#8e3000',
    surface: '#f5f7f9',
    surfaceDim: '#d0d5d8',
    surfaceBright: '#f5f7f9',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#eef1f3',
    surfaceContainer: '#e5e9eb',
    surfaceContainerHigh: '#dfe3e6',
    surfaceContainerHighest: '#d9dde0',
    onSurface: '#2c2f31',
    onSurfaceVariant: '#595c5e',
    onPrimary: '#f1f2ff',
    onSecondary: '#f8f0ff',
    onTertiary: '#ffefeb',
    background: '#f5f7f9',
    outline: '#747779',
    outlineVariant: '#abadaf',
    error: '#b31b25',
    errorContainer: '#fb5151',
    success: '#2e7d32',
    green: '#4caf50',
};

// Overall performance data
export const PERFORMANCE_DATA = {
    overallCompletion: 84,
    avgQuizScore: 9.2,
    quizScoreScale: 10,
    quizScoreTrend: '+1.4 from last month',
    weeklyHours: 32.5,
    weeklyIntensity: [40, 60, 30, 90, 50, 70, 45], // percentages for bar chart
};

// Subject progression data
export const SUBJECTS = [
    {
        id: 1,
        name: 'Advanced Mathematics',
        icon: 'calculate',
        iconColor: PROGRESS_COLORS.primary,
        iconBg: `${PROGRESS_COLORS.primary}15`,
        progress: 72,
        sparkline: [30, 50, 40, 80, 90],
        sparklineColor: PROGRESS_COLORS.primary,
    },
    {
        id: 2,
        name: 'Theoretical Physics',
        icon: 'science',
        iconColor: PROGRESS_COLORS.secondary,
        iconBg: `${PROGRESS_COLORS.secondary}15`,
        progress: 45,
        sparkline: [60, 40, 70, 30, 55],
        sparklineColor: PROGRESS_COLORS.secondary,
    },
    {
        id: 3,
        name: 'Algorithm Design',
        icon: 'terminal',
        iconColor: PROGRESS_COLORS.tertiary,
        iconBg: `${PROGRESS_COLORS.tertiary}15`,
        progress: 92,
        sparkline: [70, 80, 85, 90, 95],
        sparklineColor: PROGRESS_COLORS.tertiary,
    },
];

// Mastery levels data
export const MASTERY_LEVELS = [
    {
        id: 1,
        name: 'Logic & Reasoning',
        level: 'Level 8 Specialist',
        percentage: 75,
        color: PROGRESS_COLORS.primary,
    },
    {
        id: 2,
        name: 'Peer Collaboration',
        level: 'Level 3 Novice',
        percentage: 40,
        color: PROGRESS_COLORS.secondary,
    },
    {
        id: 3,
        name: 'Research Quality',
        level: 'Level 10 Master',
        percentage: 95,
        color: PROGRESS_COLORS.tertiary,
    },
];

// Curator's tip
export const CURATOR_TIP = {
    title: "Curator's Tip",
    content: 'Your focus on Research has reached peak performance. Diversifying into Collaboration could boost your overall score by 12% this term.',
    icon: 'lightbulb',
};

// Learning momentum heatmap data (0-3 intensity levels)
export const HEATMAP_DATA = [
    [0, 2, 1, 3, 0, 2, 2, 0, 1, 1, 1, 3, 3, 0, 0, 1, 2, 2, 0, 0, 1, 3, 3, 2, 0, 0],
    [1, 1, 3, 3, 0, 0, 2, 2, 2, 1, 1, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

export const HEATMAP_COLORS = {
    0: PROGRESS_COLORS.surfaceContainerHigh,
    1: PROGRESS_COLORS.errorContainer,
    2: PROGRESS_COLORS.tertiaryContainer,
    3: PROGRESS_COLORS.secondaryContainer,
};
