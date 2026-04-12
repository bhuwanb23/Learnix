export const UNIT_LIST_COLORS = {
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
  onPrimary: '#f1f2ff',
  onPrimaryContainer: '#001e5a',
  outlineVariant: '#abadaf',
  outline: '#747779',
};

export const UNIT_LIST_DATA = {
  subjectName: 'Data Structures',
  courseCode: 'CS-302 Advanced Curriculum',
  studentName: 'Alex Rivera',
  completionPercentage: 68,
  title: 'Mastering Logic &',
  titleHighlight: 'Efficiency.',
  completionLabel: 'Course Completion',
};

export const UNITS_DATA = [
  {
    id: 1,
    number: '01',
    title: 'Linear Foundations',
    description: 'Arrays, Linked Lists, and Memory Allocation strategies.',
    status: 'Completed',
    statusColor: UNIT_LIST_COLORS.secondary,
    statusBg: UNIT_LIST_COLORS.secondaryContainer,
    icon: 'account_tree',
    isCompleted: true,
    isInProgress: false,
    isLocked: false,
  },
  {
    id: 2,
    number: '02',
    title: 'Hierarchical Systems',
    description: 'Binary Search Trees, Heaps, and AVL Balancing.',
    status: 'In Progress',
    statusColor: UNIT_LIST_COLORS.tertiary,
    statusBg: UNIT_LIST_COLORS.tertiaryContainer,
    icon: 'hub',
    isCompleted: false,
    isInProgress: true,
    isLocked: false,
    topics: [
      { id: 1, title: 'Recursive Traversals', type: 'document', icon: 'description' },
      { id: 2, title: 'Min-Max Heap Visualizer', type: 'video', icon: 'play_circle' },
    ],
  },
  {
    id: 3,
    number: '03',
    title: 'Graph Theory',
    description: 'Directed graphs, Dijkstra\'s algorithm, and pathfinding.',
    status: 'Locked',
    statusColor: UNIT_LIST_COLORS.onSurfaceVariant,
    statusBg: UNIT_LIST_COLORS.surfaceContainerHigh,
    icon: 'analytics',
    isCompleted: false,
    isInProgress: false,
    isLocked: true,
  },
];

export const MILESTONES_DATA = [
  {
    id: 1,
    date: 'OCT 24',
    title: 'Tree Balancing Quiz',
    color: UNIT_LIST_COLORS.tertiary,
  },
  {
    id: 2,
    date: 'NOV 02',
    title: 'Final Project Kickoff',
    color: UNIT_LIST_COLORS.primary,
  },
];

export const RESOURCES_DATA = [
  {
    id: 1,
    title: 'Algorithms Visualization Lab',
    icon: 'terminal',
    color: UNIT_LIST_COLORS.primary,
    bgColor: `${UNIT_LIST_COLORS.primary}1A`,
  },
  {
    id: 2,
    title: 'Complexity Cheat Sheet',
    icon: 'menu_book',
    color: UNIT_LIST_COLORS.secondary,
    bgColor: `${UNIT_LIST_COLORS.secondary}1A`,
  },
];
