// Profile data constants
export const PROFILE_INFO = {
  name: 'Alex Johnson',
  rollNo: 'CS2024-8842',
  email: 'scholar.alexj@university.edu',
  department: 'CS Department • Semester IV',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqrwLixE4rFUHJj6YNg--3RhkhmvXhq3crYtqYXRLjJEvKNLcq9x4B_CpNK_lcOAJEBwYO4xlGk_cIWmzd3sgpQPGcAWAcm7MK-mGyT-PdQE7i_EMoOWOkKjdxS0z-cNBCHt9CqnLlCNbAS4HzUVmWPk_izcZpprXfstpv3PYrqb2gjhtBiLEsGMi8LZEBtIr34LgqQ6UTyOYzMoumbgUCg7d-OVXnCnZwxS78y7MphO0-5jfGE8q6nj5v3xmA7j55ePfBxzHSzjg',
};

export const PROFILE_STATS = {
  cgpa: 3.92,
  cgpaTrend: '+0.04 from Sem III',
  attendance: 94,
  attendanceStatus: 'Excellent',
  creditsEarned: 92,
  creditsTotal: 120,
  rank: 'TOP 5%',
  rankDetails: 'Batch of 2026 • 214 Students',
};

export const CATEGORIES = [
  { id: 'view_profile', title: 'View Profile', icon: 'edit-square', color: '#0050d4', bgColor: 'rgba(0, 80, 212, 0.1)' },
  { id: 'academic', title: 'Academic Details', icon: 'school', color: '#2563eb', bgColor: 'rgba(59, 130, 246, 0.15)' },
  { id: 'analytics', title: 'Progress & Analytics', icon: 'analytics', color: '#059669', bgColor: 'rgba(16, 185, 129, 0.15)' },
  { id: 'activity', title: 'Activity', icon: 'history', color: '#d97706', bgColor: 'rgba(245, 158, 11, 0.15)' },
  { id: 'saved', title: 'Saved', icon: 'bookmark', color: '#e11d48', bgColor: 'rgba(225, 29, 72, 0.15)' },
  { id: 'notifications', title: 'Notifications', icon: 'notifications', color: '#4f46e5', bgColor: 'rgba(79, 70, 229, 0.15)' },
  { id: 'settings', title: 'Settings', icon: 'settings', color: '#475569', bgColor: 'rgba(71, 85, 105, 0.15)' },
  { id: 'achievements', title: 'Achievements', icon: 'military-tech', color: '#9333ea', bgColor: 'rgba(147, 51, 234, 0.15)' },
];

export const HONORS = [
  {
    id: 1,
    title: "Dean's List",
    subtitle: "Winter 2023",
    icon: 'workspace-premium',
    color: '#d97706',
    bgColor: '#fef3c7',
  },
  {
    id: 2,
    title: 'Hack Winner',
    subtitle: "CodeFest '24",
    icon: 'terminal',
    color: '#2563eb',
    bgColor: '#dbeafe',
  },
  {
    id: 3,
    title: 'Lead Mentor',
    subtitle: 'Peer Support',
    icon: 'groups',
    color: '#9333ea',
    bgColor: '#f3e8ff',
  },
  {
    id: 4,
    title: 'Philanthropy',
    subtitle: '100+ Hours',
    icon: 'volunteer-activism',
    color: '#059669',
    bgColor: '#d1fae5',
  },
];

export const WALLET_INFO = {
  balance: 1240.50,
  dues: [
    { title: 'Library Dues', amount: 0.00 },
    { title: 'Meal Plan', amount: 45.00 },
  ],
};
