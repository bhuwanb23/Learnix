// Mock data for attendance marks
export const STUDENTS = [
  {
    id: '1',
    name: 'Emma Johnson',
    rollNumber: '001',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg',
    status: 'present', // present, absent, late
    attendanceRate: 95
  },
  {
    id: '2',
    name: 'Michael Chen',
    rollNumber: '002',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg',
    status: 'absent',
    attendanceRate: 78
  },
  {
    id: '3',
    name: 'Alex Rodriguez',
    rollNumber: '003',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-3.jpg',
    status: 'present',
    attendanceRate: 92
  },
  {
    id: '4',
    name: 'Sarah Wilson',
    rollNumber: '004',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg',
    status: 'present',
    attendanceRate: 88
  },
  {
    id: '5',
    name: 'David Kim',
    rollNumber: '005',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-8.jpg',
    status: 'absent',
    attendanceRate: 85
  }
];

export const CLASS_INFO = {
  className: 'Grade 10-A',
  subject: 'Math Class',
  totalStudents: 25,
  presentToday: 18,
  absentToday: 7,
  attendanceRate: 72
};

export const ATTENDANCE_TABS = [
  { id: 'today', label: "Today's Attendance", active: true },
  { id: 'history', label: 'History', active: false },
  { id: 'analytics', label: 'Analytics', active: false }
];

export const QUICK_ACTIONS = [
  { id: 'mark-all', label: 'Mark All Present', icon: '✓✓', type: 'primary' },
  { id: 'auto-mark', label: 'Auto-Mark', icon: '🤖', type: 'secondary' }
];

export const FRAUD_ALERT = {
  show: true,
  title: 'Fraud Detection Alert',
  message: 'Unusual attendance pattern detected for 2 students',
  type: 'warning'
};

// Helper functions
export const getAttendanceStats = (students) => {
  const totalStudents = students.length;
  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = students.filter(s => s.status === 'absent').length;
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return {
    totalStudents,
    presentCount,
    absentCount,
    attendanceRate
  };
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'present':
      return { bg: '#D1FAE5', text: '#059669', border: '#10B981' };
    case 'absent':
      return { bg: '#FEE2E2', text: '#DC2626', border: '#EF4444' };
    case 'late':
      return { bg: '#FEF3C7', text: '#D97706', border: '#F59E0B' };
    default:
      return { bg: '#F3F4F6', text: '#6B7280', border: '#9CA3AF' };
  }
};

export const getStatusIcon = (status) => {
  switch (status) {
    case 'present':
      return '✓';
    case 'absent':
      return '✕';
    case 'late':
      return '⏰';
    default:
      return '?';
  }
};

export const markAllPresent = (students) => {
  return students.map(student => ({
    ...student,
    status: 'present'
  }));
};

export const markAllAbsent = (students) => {
  return students.map(student => ({
    ...student,
    status: 'absent'
  }));
};

export const toggleStudentStatus = (students, studentId, newStatus) => {
  return students.map(student => 
    student.id === studentId 
      ? { ...student, status: newStatus }
      : student
  );
};

export const getProgressPercentage = (present, total) => {
  return total > 0 ? Math.round((present / total) * 100) : 0;
};

export const formatAttendanceRate = (rate) => {
  return `${rate}%`;
};

export const getFraudAlertStyle = (type) => {
  switch (type) {
    case 'warning':
      return {
        bg: 'linear-gradient(to right, #FFF7ED, #FEF2F2)',
        border: '#FED7AA',
        icon: '⚠️',
        titleColor: '#9A3412',
        messageColor: '#C2410C'
      };
    case 'error':
      return {
        bg: 'linear-gradient(to right, #FEF2F2, #FEE2E2)',
        border: '#FECACA',
        icon: '🚨',
        titleColor: '#991B1B',
        messageColor: '#DC2626'
      };
    default:
      return {
        bg: 'linear-gradient(to right, #EFF6FF, #DBEAFE)',
        border: '#93C5FD',
        icon: 'ℹ️',
        titleColor: '#1E40AF',
        messageColor: '#2563EB'
      };
  }
};
