// Mock data for attendance class list
export const ATTENDANCE_CLASSES = [
  {
    id: '1',
    className: 'Mathematics',
    subject: 'Mathematics',
    grade: 'Grade 10',
    semester: 'Semester 1',
    classCode: 'MATH101',
    totalStudents: 28,
    presentToday: 26,
    attendanceRate: 92,
    time: '09:00 - 10:30 AM',
    room: 'Room 201',
    color: '#3B82F6',
    status: 'good'
  },
  {
    id: '2',
    className: 'Physics',
    subject: 'Physics',
    grade: 'Grade 11',
    semester: 'Semester 2',
    classCode: 'PHYS201',
    totalStudents: 24,
    presentToday: 19,
    attendanceRate: 78,
    time: '11:00 - 12:30 PM',
    room: 'Lab 105',
    color: '#1D4ED8',
    status: 'warning'
  },
  {
    id: '3',
    className: 'Chemistry',
    subject: 'Chemistry',
    grade: 'Grade 12',
    semester: 'Semester 1',
    classCode: 'CHEM101',
    totalStudents: 26,
    presentToday: 23,
    attendanceRate: 89,
    time: '01:30 - 03:00 PM',
    room: 'Room 305',
    color: '#2563EB',
    status: 'good'
  },
  {
    id: '4',
    className: 'English Literature',
    subject: 'English',
    grade: 'Grade 9',
    semester: 'Semester 2',
    classCode: 'ENG101',
    totalStudents: 30,
    presentToday: 20,
    attendanceRate: 65,
    time: '03:30 - 05:00 PM',
    room: 'Room 102',
    color: '#DC2626',
    status: 'poor'
  },
  {
    id: '5',
    className: 'Biology',
    subject: 'Biology',
    grade: 'Grade 11',
    semester: 'Semester 1',
    classCode: 'BIO101',
    totalStudents: 22,
    presentToday: 21,
    attendanceRate: 94,
    time: '05:30 - 07:00 PM',
    room: 'Lab 203',
    color: '#059669',
    status: 'excellent'
  }
];

export const ATTENDANCE_TABS = [
  { id: 'today', label: "Today's Classes", active: true },
  { id: 'upcoming', label: 'Upcoming', active: false },
  { id: 'past', label: 'Past Records', active: false }
];

export const ATTENDANCE_ACTIONS = [
  { id: 'mark', label: 'Take Attendance', type: 'primary' },
  { id: 'reports', label: 'View Reports', type: 'secondary' },
  { id: 'add', label: 'Add Class', type: 'floating' }
];

// Helper functions
export const getAttendanceStatus = (rate) => {
  if (rate >= 90) return { status: 'excellent', color: '#10B981', bgColor: '#D1FAE5' };
  if (rate >= 80) return { status: 'good', color: '#059669', bgColor: '#D1FAE5' };
  if (rate >= 70) return { status: 'warning', color: '#D97706', bgColor: '#FEF3C7' };
  return { status: 'poor', color: '#DC2626', bgColor: '#FEE2E2' };
};

export const getAttendanceStats = (classes) => {
  const totalClasses = classes.length;
  const totalStudents = classes.reduce((sum, cls) => sum + cls.totalStudents, 0);
  const totalPresent = classes.reduce((sum, cls) => sum + cls.presentToday, 0);
  const averageAttendance = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

  return {
    totalClasses,
    totalStudents,
    totalPresent,
    averageAttendance
  };
};

export const filterClassesByTab = (classes, activeTab) => {
  switch (activeTab) {
    case 'today':
      return classes; // All classes for today
    case 'upcoming':
      return classes.filter(cls => cls.attendanceRate < 80); // Classes needing attention
    case 'past':
      return classes.slice(0, 3); // Recent past classes
    default:
      return classes;
  }
};

export const searchClasses = (classes, query) => {
  if (!query.trim()) return classes;
  
  const lowercaseQuery = query.toLowerCase();
  return classes.filter(cls => 
    cls.className.toLowerCase().includes(lowercaseQuery) ||
    cls.subject.toLowerCase().includes(lowercaseQuery) ||
    cls.grade.toLowerCase().includes(lowercaseQuery) ||
    cls.classCode.toLowerCase().includes(lowercaseQuery)
  );
};

export const formatTime = (timeString) => {
  return timeString; // Already formatted in mock data
};

export const formatAttendanceRate = (rate) => {
  return `${rate}%`;
};
