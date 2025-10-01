// Profile data constants
export const PROFILE_STATS = {
  wellBeingScore: 87,
  dayStreak: 15,
  walletBalance: 245.80,
};

export const QUICK_ACTIONS = [
  {
    id: 'counselor',
    title: 'Book Counselor',
    subtitle: 'Schedule session',
    icon: 'calendar-check',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  {
    id: 'payments',
    title: 'Pay Fees',
    subtitle: 'Secure payment',
    icon: 'credit-card',
    color: '#10b981',
    backgroundColor: '#f0fdf4',
  },
];

export const HABITS = [
  {
    id: 1,
    title: 'Morning Exercise',
    completed: true,
    points: 10,
    color: '#10b981',
  },
  {
    id: 2,
    title: 'Drink 8 Glasses Water',
    completed: true,
    points: 5,
    color: '#10b981',
  },
  {
    id: 3,
    title: 'Study 2 Hours',
    completed: false,
    points: 15,
    color: '#6b7280',
  },
  {
    id: 4,
    title: 'Read 30 Minutes',
    completed: false,
    points: 8,
    color: '#6b7280',
  },
  {
    id: 5,
    title: 'Meditation',
    completed: false,
    points: 12,
    color: '#6b7280',
  },
];

export const ACHIEVEMENTS = [
  {
    id: 1,
    title: 'Study Streak',
    subtitle: '7 days',
    icon: 'trophy',
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
    earned: '2 days ago',
  },
  {
    id: 2,
    title: 'Top Performer',
    subtitle: 'This week',
    icon: 'medal',
    color: '#8b5cf6',
    backgroundColor: '#f3e8ff',
    earned: '1 week ago',
  },
  {
    id: 3,
    title: 'Wellness',
    subtitle: 'Champion',
    icon: 'star',
    color: '#10b981',
    backgroundColor: '#dcfce7',
    earned: '3 days ago',
  },
];

export const WALLET_TRANSACTIONS = [
  {
    id: 1,
    title: 'Cafeteria Payment',
    amount: -12.50,
    date: '2024-01-15',
    type: 'expense',
    icon: 'utensils',
  },
  {
    id: 2,
    title: 'Library Fine',
    amount: -5.00,
    date: '2024-01-14',
    type: 'expense',
    icon: 'book',
  },
  {
    id: 3,
    title: 'Refund - Lab Equipment',
    amount: 25.00,
    date: '2024-01-13',
    type: 'income',
    icon: 'arrow-up',
  },
  {
    id: 4,
    title: 'Campus Store',
    amount: -8.75,
    date: '2024-01-12',
    type: 'expense',
    icon: 'shopping-bag',
  },
];

export const COUNSELORS = [
  {
    id: 1,
    name: 'Dr. Emily Smith',
    title: 'Academic Counselor',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg',
    available: true,
    rating: 4.8,
  },
  {
    id: 2,
    name: 'Dr. Michael Johnson',
    title: 'Career Counselor',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-6.jpg',
    available: true,
    rating: 4.9,
  },
  {
    id: 3,
    name: 'Dr. Sarah Wilson',
    title: 'Mental Health Counselor',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-7.jpg',
    available: false,
    rating: 4.7,
  },
];

export const OUTSTANDING_FEES = [
  {
    id: 1,
    title: 'Tuition Fee - Fall 2024',
    amount: 2850,
    dueDate: '2024-10-15',
    status: 'overdue',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  {
    id: 2,
    title: 'Lab Fee - Chemistry',
    amount: 150,
    dueDate: '2024-11-01',
    status: 'due_soon',
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
  },
  {
    id: 3,
    title: 'Library Fee',
    amount: 75,
    dueDate: '2024-12-01',
    status: 'upcoming',
    color: '#10b981',
    backgroundColor: '#f0fdf4',
  },
];
