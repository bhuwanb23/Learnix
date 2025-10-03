export const dashboardConstants = {
  // Profile data
  userProfile: {
    name: "Sarah",
    greeting: "Ready to learn today?",
    avatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg",
    notifications: 3
  },

  // Quick actions data
  quickActions: [
    {
      id: 'upload',
      title: 'Upload Assignment',
      icon: 'cloud-upload-outline',
      color: '#3B82F6',
      backgroundColor: '#3B82F6'
    },
    {
      id: 'join',
      title: 'Join Exam',
      icon: 'videocam-outline',
      color: '#10B981',
      backgroundColor: '#10B981'
    },
    {
      id: 'results',
      title: 'Check Results',
      icon: 'analytics-outline',
      color: '#8B5CF6',
      backgroundColor: '#8B5CF6'
    }
  ],

  // Progress data
  progressData: [
    {
      id: 'course',
      title: 'Course Completion',
      percentage: 78,
      color: '#3B82F6'
    },
    {
      id: 'submissions',
      title: 'Assignment Submissions',
      percentage: 85,
      color: '#10B981'
    },
    {
      id: 'exam-readiness',
      title: 'Exam Readiness',
      percentage: 62,
      color: '#F97316'
    }
  ],

  // Pending assignments
  pendingAssignments: [
    {
      id: 1,
      title: 'Mathematics Essay',
      subject: 'Calculus & Applications',
      dueDate: new Date('2024-10-04'),
      priority: 'high',
      priorityColor: '#F87171'
    },
    {
      id: 2,
      title: 'Physics Lab Report',
      subject: 'Quantum Mechanics',
      dueDate: new Date('2024-10-06'),
      priority: 'medium',
      priorityColor: '#FB923C'
    }
  ],

  // Upcoming exams
  upcomingExams: [
    {
      id: 1,
      title: 'Chemistry Final',
      subject: 'Organic Chemistry - Room 205',
      examDate: new Date('2024-10-05T14:00:00'),
      readiness: 75,
      color: '#3B82F6',
      gradientFrom: '#EFF6FF',
      gradientTo: '#DBEAFE'
    },
    {
      id: 2,
      title: 'History Midterm',
      subject: 'World War II - Online',
      examDate: new Date('2024-10-08T10:00:00'),
      readiness: 60,
      color: '#8B5CF6',
      gradientFrom: '#FAF5FF',
      gradientTo: '#F3E8FF'
    }
  ],

  // Recent completions
  recentCompletions: [
    {
      id: 1,
      title: 'Biology Quiz',
      score: 92,
      date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      type: 'quiz'
    },
    {
      id: 2,
      title: 'English Essay',
      grade: 'A-',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      type: 'assignment'
    }
  ],

  // Notifications
  notifications: [
    {
      id: 1,
      type: 'warning',
      title: 'Assignment Reminder',
      message: 'Mathematics Essay due tomorrow at 11:59 PM',
      time: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      color: '#F59E0B',
      icon: 'warning-outline'
    },
    {
      id: 2,
      type: 'info',
      title: 'Teacher Feedback',
      message: 'Great work on your Biology presentation!',
      time: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      color: '#3B82F6',
      icon: 'chatbubble-outline'
    },
    {
      id: 3,
      type: 'success',
      title: 'Course Update',
      message: 'New study materials added to Chemistry course',
      time: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      color: '#10B981',
      icon: 'information-circle-outline'
    }
  ]
};

export const mockDashboardData = {
  profile: dashboardConstants.userProfile,
  quickActions: dashboardConstants.quickActions,
  progress: dashboardConstants.progressData,
  pendingAssignments: dashboardConstants.pendingAssignments,
  upcomingExams: dashboardConstants.upcomingExams,
  recentCompletions: dashboardConstants.recentCompletions,
  notifications: dashboardConstants.notifications
};
