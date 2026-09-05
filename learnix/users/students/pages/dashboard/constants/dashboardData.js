// Dashboard data constants
export const DASHBOARD_DATA = {
  user: {
    name: 'Alex',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBsClPfNvd3jS54p9_Rrcod9wYqiEkFEydYeEfGQ3MP5Bt17rxMQlxeng1YRBuxEzUExa-ak11HiLTz8c2hOXtQ6tERWfTCJlKeJX_8F4Aah-GRYnv9b2dbDmWj5gVUlgAN5n7CPcwQnxP3T9GrZQmy8lSH0DGMDf3A4Gq3N-8XgbHzmWpJ0kqJs2F5iPt3nMmyhhDmMY703OSDDqNu6uX12hY_zCrU6C8bNZ4sgPVbTw-UI2bsR5pvaXRIYcjwldSAyjv461k3X18',
    greeting: 'Ready to continue your Advanced Mathematics journey?',
  },
  
  attendance: {
    percentage: 85,
    dailyData: [
      { day: 'M', percentage: 40, height: '40%' },
      { day: 'T', percentage: 80, height: '80%' },
      { day: 'W', percentage: 60, height: '60%' },
      { day: 'T', percentage: 95, height: '95%' },
      { day: 'F', percentage: 50, height: '50%' },
      { day: 'S', percentage: 70, height: '70%' },
    ],
  },
  
  schedule: [
    {
      id: 1,
      subject: 'Advanced Calculus',
      room: 'Room 402',
      professor: 'Prof. Eleanor Vance',
      time: '09:00 AM',
      duration: '60 mins',
      icon: 'functions',
      color: '#0050d4',
      bgColor: 'rgba(0, 80, 212, 0.1)',
    },
    {
      id: 2,
      subject: 'Cognitive Science',
      room: 'Lab 12',
      professor: 'Dr. Marcus Thorne',
      time: '11:30 AM',
      duration: '90 mins',
      icon: 'psychology',
      color: '#702ae1',
      bgColor: 'rgba(112, 42, 225, 0.1)',
    },
  ],
  
  aiBuddy: {
    message: "Hey Alex! I see you have a calculus class coming up. Want to review the Taylor Series before you head in?",
    placeholder: 'Ask anything...',
    status: 'Online & Thinking',
    focusTopic: 'Taylor Series',
  },
  
  performance: {
    subjects: [
      { 
        name: 'Mathematics', 
        weeks: ['primary', 'primary', 'primary', 'primary/20'],
        color: '#0050d4'
      },
      { 
        name: 'Literature', 
        weeks: ['tertiary', 'tertiary', 'tertiary/40', 'tertiary/20'],
        color: '#a23800'
      },
      { 
        name: 'Physics', 
        weeks: ['error', 'error/40', 'error/20', 'error/10'],
        color: '#b31b25'
      },
    ],
  },
  
  notifications: [
    {
      id: 1,
      type: 'urgent',
      icon: 'error',
      title: 'Physics Assignment Due Today',
      message: 'Submit by 11:59 PM to avoid late penalty.',
      bgColor: 'rgba(251, 81, 81, 0.1)',
      iconColor: '#b31b25',
    },
    {
      id: 2,
      type: 'success',
      icon: 'celebration',
      title: 'New Grade Released: Biology',
      message: 'You scored 94% in the Semester Final.',
      bgColor: 'rgba(255, 149, 106, 0.1)',
      iconColor: '#a23800',
    },
    {
      id: 3,
      type: 'info',
      icon: 'campaign',
      title: 'Campus Library Update',
      message: 'Opening hours extended to 2:00 AM for finals.',
      bgColor: 'rgba(123, 156, 255, 0.1)',
      iconColor: '#0050d4',
    },
  ],
  
  quickActions: [
    {
      id: 'classes',
      label: 'Classes',
      icon: 'book-outline',
      bgColor: 'rgba(59, 130, 246, 0.15)',
      hoverBg: 'rgba(59, 130, 246, 0.25)',
      textColor: '#2563eb',
      iconColor: '#2563eb',
    },
    {
      id: 'assignments',
      label: 'Assignments',
      icon: 'document-text-outline',
      bgColor: 'rgba(139, 92, 246, 0.15)',
      hoverBg: 'rgba(139, 92, 246, 0.25)',
      textColor: '#7c3aed',
      iconColor: '#7c3aed',
    },
    {
      id: 'events',
      label: 'Events',
      icon: 'calendar-outline',
      bgColor: 'rgba(16, 185, 129, 0.15)',
      hoverBg: 'rgba(16, 185, 129, 0.25)',
      textColor: '#059669',
      iconColor: '#059669',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: 'person-outline',
      bgColor: 'rgba(245, 158, 11, 0.15)',
      hoverBg: 'rgba(245, 158, 11, 0.25)',
      textColor: '#d97706',
      iconColor: '#d97706',
    },
  ],
};

export const COLORS = {
  primary: '#2563eb',
  secondary: '#3b82f6',
  accent: '#60a5fa',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
  },
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
  },
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    500: '#a855f7',
    600: '#9333ea',
  },
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    500: '#f97316',
    600: '#ea580c',
  },
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
  },
  yellow: {
    50: '#fefce8',
    100: '#fef3c7',
    500: '#eab308',
    600: '#ca8a04',
  },
};
