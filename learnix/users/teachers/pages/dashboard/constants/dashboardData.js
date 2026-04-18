export const TEACHER_DASHBOARD_DATA = {
  header: {
    greeting: 'Welcome Back,',
    name: 'Prof. Thompson',
    title: 'Good Morning',
    stats: [
      { label: 'Active Classes', value: '12' },
      { label: 'Pending Gradings', value: '8' },
    ],
  },
  quickActions: [
    { id: 'my_classes', label: 'My Classes', icon: 'school', color: '#0050d4' },
    { id: 'manage_assignments', label: 'Manage Assignments', icon: 'assignment', color: '#702ae1' },
    { id: 'student_insights', label: 'Student Insights', icon: 'monitoring', color: '#059669' },
    { id: 'teaching_profile', label: 'Teaching Profile', icon: 'account-circle', color: '#a23800' },
  ],
  schedule: [
    { 
      id: 's1', 
      time: '09:00 - 10:30 AM', 
      title: 'Advanced Econometrics', 
      location: 'Lecture Hall B, Floor 2',
      canJoin: true,
    },
    { 
      id: 's2', 
      time: '11:00 - 12:30 PM', 
      title: 'Macroeconomics 101', 
      location: 'Virtual Classroom 4',
      canJoin: true,
    },
    { 
      id: 's3', 
      time: '02:00 - 03:30 PM', 
      title: 'Data Analysis Seminar', 
      location: 'Main Lab',
      canJoin: true,
    },
  ],
  performance: {
    radarMetrics: [
      { label: 'Engagement', value: 85 },
      { label: 'Retention', value: 78 },
      { label: 'Grades', value: 82 },
      { label: 'Attendance', value: 88 },
      { label: 'Participation', value: 75 },
    ],
    attendanceStats: [
      { day: 'MON', percentage: 60 },
      { day: 'TUE', percentage: 85 },
      { day: 'WED', percentage: 95 },
      { day: 'THU', percentage: 75 },
      { day: 'FRI', percentage: 40 },
    ],
    averageAttendance: 88.4,
  },
  insights: [
    { id: 'i1', label: 'Student Rating', value: '4.8', color: '#702ae1' },
    { id: 'i2', label: 'Completion Rate', value: '92%', color: '#059669' },
    { id: 'i3', label: 'Research Credits', value: '15', color: '#a23800' },
  ],
  submissions: [
    {
      id: 'sub1',
      name: 'Alex Rivera',
      assignment: 'Macroeconomics Essay - Final Draft',
      time: '2m ago',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBeAk9JIvoUk1e-ld6dcwLnOLOV4wE94XC92wNTMlPo-qTsNHn9A25NLg2qKs-JXwsxngw6BBC7mRAeOf8Nim83S25Lhf4tEfVWpaCaKLcgG8ZpZWrVJBlHVVubZQyp3qts93os_9ypVmnMtvEBdiTOPiZFowcA_BR5ZaUGOAGjM7Ro9hqzs4fTmsnH0czcB10rjJhxDm4VSqOFAJ4sJQVYiqu8HucBnfx0NTcpByflArYwqBbBb1wLVsztDiSX-DLc-RY7B37jwHM',
    },
    {
      id: 'sub2',
      name: 'Sarah Chen',
      assignment: 'Statistical Modeling Project',
      time: '15m ago',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBsKXydZrX2iF-CmiDhNIBI1BvWzAk83igHZ01rO-nAk0tMgcKHO30qT8HcaSaIU7OOWWRraNQJAQCe5V6tGMrr-ehCfxD7bDAyi2eN7wB0a-9pKvv6iUzPdbB7mB38eqC1sN8wQ4g90021u-X1JnIytrIPxATY2v3ahEKSeG-iBxjW_YJmPMbqAYHjPt6GXoWyvUTnsuabcKEjuOvai4AM2L9ibMIyVKVhpRC2yt9jOf1rjUVGUIzt98HN2CAOI5GsrC-7xZU74Do',
    },
  ],
};
