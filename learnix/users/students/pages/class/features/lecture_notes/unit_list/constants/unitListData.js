// Unit List data constants

export const UNIT_COLORS = {
  primary: '#0050d4',
  primaryDim: '#0046bb',
  secondary: '#702ae1',
  tertiary: '#a23800',
  surface: '#f5f7f9',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eef1f3',
  surfaceContainerHigh: '#dfe3e6',
  onSurface: '#2c2f31',
  onSurfaceVariant: '#595c5e',
  secondaryContainer: '#dcc9ff',
  onSecondaryContainer: '#5b00c7',
  tertiaryContainer: '#ff956a',
  onTertiaryContainer: '#5a1c00',
};

export const SUBJECT_HERO = {
  code: 'CS-204',
  title: 'Data Structures',
  description: 'Master the architectural foundations of computer science through hands-on exploration of algorithms and data efficiency.',
  progress: 64,
  lecturesLeft: 12,
};

export const UNITS = [
  {
    id: 'unit-1',
    unitNumber: 1,
    title: 'Introduction to Data Structures',
    description: 'Foundational concepts, Big O notation, and memory management basics.',
    icon: 'layers',
    iconColor: UNIT_COLORS.primary,
    iconBgColor: 'rgba(0, 80, 212, 0.05)',
    progress: 100,
    status: 'completed',
    lecturesCompleted: 4,
    totalLectures: 4,
    timeSpent: '12h 45m',
  },
  {
    id: 'unit-2',
    unitNumber: 2,
    title: 'Trees & Hierarchies',
    description: 'Binary Search Trees, AVL, Red-Black Trees, and Heaps.',
    icon: 'account-tree',
    iconColor: UNIT_COLORS.secondary,
    iconBgColor: 'rgba(112, 42, 225, 0.05)',
    progress: 45,
    status: 'in-progress',
    lecturesCompleted: 3,
    totalLectures: 8,
    statusText: 'Currently Learning',
  },
  {
    id: 'unit-3',
    unitNumber: 3,
    title: 'Graphs & Network Analysis',
    description: 'Directed and undirected graphs, BFS, DFS, and shortest path algorithms.',
    icon: 'hub',
    iconColor: UNIT_COLORS.tertiary,
    iconBgColor: 'rgba(162, 56, 0, 0.05)',
    progress: 0,
    status: 'locked',
    lecturesCompleted: 0,
    totalLectures: 0,
  },
];

export const RESOURCES = [
  {
    id: 'resource-1',
    title: 'Practice Codebase',
    description: 'Access the Git repository containing all C++ implementations discussed in Unit 2.',
    buttonText: 'Browse Repository',
    icon: 'code',
    bgColor: UNIT_COLORS.secondaryContainer,
    textColor: UNIT_COLORS.onSecondaryContainer,
    span: 2,
  },
  {
    id: 'resource-2',
    title: 'Quiz Time',
    description: 'Test your knowledge on Tree traversals.',
    buttonText: 'Start Quiz',
    icon: 'quiz',
    bgColor: UNIT_COLORS.tertiaryContainer,
    textColor: UNIT_COLORS.onTertiaryContainer,
    span: 1,
  },
];
