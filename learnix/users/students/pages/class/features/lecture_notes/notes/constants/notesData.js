export const NOTES_COLORS = {
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
  onError: '#ffefee',
  errorContainer: '#fb5151',
};

export const NOTES_DATA = {
  subject: 'Molecular Biology',
  category: 'Advanced Data Structures',
  readTime: '12 min read',
  title: 'Binary Trees: Core Concepts',
  description: 'Explore the hierarchical structure of binary trees, traversal algorithms, and balancing techniques essential for efficient data management.',
  activeTab: 'summary',
  tabs: ['Summary', 'PDF', 'Media'],
  sections: [
    {
      id: 1,
      title: '1. Fundamental Definitions',
      content: 'A binary tree is a hierarchical data structure in which each node has at most two children, referred to as the left child and the right child. Unlike arrays or linked lists, which are linear, trees represent a branching relationship common in file systems and organizational charts.',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCCLTpI8W9YZ2-lPiVAfDW0j_KHQFE_mNlWofd_ACaD6N8caygLZpEk_uIW1R3hyKVajmL8b2rx-4f03NUdjobhPjiqt07zpfymOYrPHHfaz5AExi0rpx_fw-Was4zzO7UOBpoFZTgiyImQcwNspUq1DMX2LM8CAyJukcxIrbdZ_xeQqYoQXeGsyOhFjw4fT9-OQMW-MBOwIv-d8m-SrRkEwWepls5FbrLGQsPJYS29638lD05_lcRmxFAfrkmhKl91OczM3-yoJ_g',
      imageCaption: 'Fig 1.1: A Perfect Binary Tree structure showing level hierarchy.',
    },
    {
      id: 2,
      title: '2. Tree Traversals',
      cards: [
        { type: 'In-order', description: 'Left, Root, Right. Used in BSTs.', color: NOTES_COLORS.primary },
        { type: 'Pre-order', description: 'Root, Left, Right. Used to clone trees.', color: NOTES_COLORS.secondary },
        { type: 'Post-order', description: 'Left, Right, Root. Used to delete trees.', color: NOTES_COLORS.tertiary },
      ],
    },
    {
      id: 3,
      title: 'Implementation Logic',
      hasCode: true,
      code: `class Node {
  int value;
  Node left, right;

  Node(int item) {
    value = item;
    left = right = null;
  }
}`,
    },
  ],
  progress: 70,
  progressLabel: 'Good Progress!',
  progressNote: 'Complete the Media tab to reach 100% mastery.',
  studyTools: [
    { icon: 'style', label: '24 Flashcards', color: NOTES_COLORS.secondary },
    { icon: 'quiz', label: 'Topic Quiz', color: NOTES_COLORS.tertiary },
    { icon: 'lightbulb', label: 'AI Explainer', color: NOTES_COLORS.primary },
  ],
  quote: {
    text: '"A tree\'s beauty lies in its balance, just as a program\'s efficiency lies in its structure."',
    author: "— Knuth's Philosophy",
  },
};
