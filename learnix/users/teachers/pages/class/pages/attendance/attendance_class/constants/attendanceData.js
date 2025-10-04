// Mock data for teacher's classes
export const TEACHER_CLASSES = [
  {
    id: '1',
    className: 'Mathematics 101',
    subject: 'Mathematics',
    classCode: 'MATH101',
    semester: 'Fall 2024',
    totalStudents: 45,
    presentToday: 42,
    attendanceRate: 93.3,
    nextClass: '2024-01-15T10:00:00Z',
    room: 'Room 201',
    color: '#3B82F6', // Blue
    icon: '📊'
  },
  {
    id: '2',
    className: 'Physics 201',
    subject: 'Physics',
    classCode: 'PHYS201',
    semester: 'Fall 2024',
    totalStudents: 38,
    presentToday: 35,
    attendanceRate: 92.1,
    nextClass: '2024-01-15T14:00:00Z',
    room: 'Lab 105',
    color: '#1D4ED8', // Darker blue
    icon: '🔬'
  },
  {
    id: '3',
    className: 'Chemistry 101',
    subject: 'Chemistry',
    classCode: 'CHEM101',
    semester: 'Fall 2024',
    totalStudents: 52,
    presentToday: 48,
    attendanceRate: 92.3,
    nextClass: '2024-01-16T09:00:00Z',
    room: 'Room 305',
    color: '#2563EB', // Medium blue
    icon: '🧪'
  },
  {
    id: '4',
    className: 'Biology 301',
    subject: 'Biology',
    classCode: 'BIO301',
    semester: 'Fall 2024',
    totalStudents: 29,
    presentToday: 27,
    attendanceRate: 93.1,
    nextClass: '2024-01-16T11:00:00Z',
    room: 'Lab 208',
    color: '#1E40AF', // Navy blue
    icon: '🧬'
  },
  {
    id: '5',
    className: 'Computer Science 101',
    subject: 'Computer Science',
    classCode: 'CS101',
    semester: 'Fall 2024',
    totalStudents: 60,
    presentToday: 55,
    attendanceRate: 91.7,
    nextClass: '2024-01-17T13:00:00Z',
    room: 'Computer Lab 1',
    color: '#1E3A8A', // Dark blue
    icon: '💻'
  },
  {
    id: '6',
    className: 'English Literature',
    subject: 'English',
    classCode: 'ENG201',
    semester: 'Fall 2024',
    totalStudents: 35,
    presentToday: 32,
    attendanceRate: 91.4,
    nextClass: '2024-01-17T15:00:00Z',
    room: 'Room 102',
    color: '#1D4ED8', // Blue
    icon: '📚'
  }
];

// Quick actions for attendance
export const ATTENDANCE_ACTIONS = [
  {
    id: 'mark-attendance',
    title: 'Mark Attendance',
    subtitle: 'Take attendance for a class',
    icon: '✅',
    color: '#10B981'
  },
  {
    id: 'view-reports',
    title: 'View Reports',
    subtitle: 'Check attendance reports',
    icon: '📊',
    color: '#3B82F6'
  },
  {
    id: 'export-data',
    title: 'Export Data',
    subtitle: 'Export attendance data',
    icon: '📤',
    color: '#8B5CF6'
  },
  {
    id: 'settings',
    title: 'Settings',
    subtitle: 'Configure attendance settings',
    icon: '⚙️',
    color: '#6B7280'
  }
];

// Helper functions
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getAttendanceStatus = (rate) => {
  if (rate >= 95) return { status: 'Excellent', color: '#10B981' };
  if (rate >= 90) return { status: 'Good', color: '#3B82F6' };
  if (rate >= 80) return { status: 'Fair', color: '#F59E0B' };
  return { status: 'Poor', color: '#EF4444' };
};

export const getClassStats = (classes) => {
  const totalClasses = classes.length;
  const totalStudents = classes.reduce((sum, cls) => sum + cls.totalStudents, 0);
  const totalPresent = classes.reduce((sum, cls) => sum + cls.presentToday, 0);
  const averageAttendance = totalStudents > 0 ? (totalPresent / totalStudents) * 100 : 0;

  return {
    totalClasses,
    totalStudents,
    totalPresent,
    averageAttendance: Math.round(averageAttendance * 10) / 10
  };
};
