export const TEACHER_DASHBOARD_DATA = {
  header: {
    name: 'Sarah Johnson',
    greeting: 'Good Morning',
    dateText: 'Today, October 3rd',
    classesScheduledText: '5 Classes Scheduled',
    notifications: 2,
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg',
  },
  quickActions: [
    { id: 'start_class', label: 'Start Class', icon: 'play', gradient: ['#3B82F6', '#2563EB'] },
    { id: 'mark_attendance', label: 'Mark Attendance', icon: 'checkmark-circle', gradient: ['#22C55E', '#16A34A'] },
    { id: 'upload_notes', label: 'Upload Notes', icon: 'cloud-upload', gradient: ['#A855F7', '#9333EA'] },
  ],
  schedule: [
    { id: 's1', title: 'Mathematics - Grade 10A', place: 'Room 201', time: '9:00 - 10:30 AM', emphasis: true },
    { id: 's2', title: 'Physics - Grade 11B', place: 'Lab 105', time: '11:00 AM - 12:30 PM', emphasis: false },
    { id: 's3', title: 'Mathematics - Grade 12A', place: 'Room 203', time: '2:00 - 3:30 PM', emphasis: false },
  ],
  navCards: [
    { id: 'classes', title: 'Classes', subtitle: 'Manage your classes', icon: 'people', color: '#2563EB', bg: '#DBEAFE' },
    { id: 'assignments', title: 'Assignments', subtitle: 'Track progress', icon: 'clipboard', color: '#16A34A', bg: '#DCFCE7' },
    { id: 'performance', title: 'Performance', subtitle: 'Student analytics', icon: 'trending-up', color: '#9333EA', bg: '#F3E8FF' },
    { id: 'profile', title: 'Profile', subtitle: 'Settings & community', icon: 'person-circle', color: '#EA580C', bg: '#FFEDD5' },
  ],
  reminders: [
    { id: 'r1', title: 'Physics Lab Report', meta: 'Grade 11B • Due tomorrow', color: '#EF4444', bg: '#FEE2E2' },
    { id: 'r2', title: 'Math Homework Review', meta: 'Grade 10A • Due in 3 days', color: '#F59E0B', bg: '#FEF3C7' },
  ],
  notifications: [
    { id: 'n1', title: 'New student joined Grade 10A', time: '2 hours ago', color: '#3B82F6' },
    { id: 'n2', title: 'Assignment submitted by John Doe', time: '4 hours ago', color: '#22C55E' },
    { id: 'n3', title: 'Parent-teacher meeting scheduled', time: 'Yesterday', color: '#A855F7' },
  ],
};


