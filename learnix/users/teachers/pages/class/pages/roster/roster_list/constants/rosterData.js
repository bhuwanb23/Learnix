// Data constants for the class Roster page - teacher view

export const ROSTER_HEADER = {
  title: 'Class Roster',
  code: 'PSY-402',
  courseName: 'Advanced Cognitive Psychology',
};

export const ROSTER_OVERVIEW = {
  totalStudents: 10,
  presentToday: 7,
  absentToday: 2,
  lateToday: 1,
  avgAttendance: 86,
  atRisk: 2,
  label: 'Attendance this week',
};

export const FILTERS = [
  { id: 'all', label: 'All (10)' },
  { id: 'present', label: 'Present (7)' },
  { id: 'absent', label: 'Absent (2)' },
  { id: 'at_risk', label: 'At Risk (2)' },
];

export const SORT_OPTIONS = [
  { id: 'name', label: 'Name' },
  { id: 'attendance', label: 'Attendance' },
];

export const STUDENTS = [
  {
    id: 'JS',
    name: 'Julianna Sterling',
    studentId: '22BSCS042',
    attendance: 94,
    status: 'present',
    risk: false,
    avatarBg: '#dcc9ff',
    avatarText: '#5b00c7',
  },
  {
    id: 'MK',
    name: 'Marcus Kinsley',
    studentId: '22BSCS017',
    attendance: 61,
    status: 'absent',
    risk: true,
    avatarBg: '#fde3e5',
    avatarText: '#b31b25',
  },
  {
    id: 'AP',
    name: 'Ananya Patel',
    studentId: '22BSCS023',
    attendance: 97,
    status: 'present',
    risk: false,
    avatarBg: '#d3e9ff',
    avatarText: '#0050d4',
  },
  {
    id: 'RC',
    name: 'Rohan Chatterjee',
    studentId: '22BSCS031',
    attendance: 72,
    status: 'absent',
    risk: true,
    avatarBg: '#fde3e5',
    avatarText: '#b31b25',
  },
  {
    id: 'SK',
    name: 'Sofia Kapoor',
    studentId: '22BSCS055',
    attendance: 89,
    status: 'present',
    risk: false,
    avatarBg: '#c8f0d8',
    avatarText: '#16a34a',
  },
  {
    id: 'DL',
    name: 'Daniel Lewis',
    studentId: '22BSCS009',
    attendance: 91,
    status: 'present',
    risk: false,
    avatarBg: '#fff0c9',
    avatarText: '#d97706',
  },
  {
    id: 'MI',
    name: 'Meera Iyer',
    studentId: '22BSCS064',
    attendance: 83,
    status: 'late',
    risk: false,
    avatarBg: '#d3e9ff',
    avatarText: '#0050d4',
  },
  {
    id: 'TK',
    name: 'Tariq Khan',
    studentId: '22BSCS027',
    attendance: 95,
    status: 'present',
    risk: false,
    avatarBg: '#dcc9ff',
    avatarText: '#5b00c7',
  },
  {
    id: 'EM',
    name: 'Emily Marsh',
    studentId: '22BSCS071',
    attendance: 88,
    status: 'present',
    risk: false,
    avatarBg: '#c8f0d8',
    avatarText: '#16a34a',
  },
  {
    id: 'VS',
    name: 'Vikram Singh',
    studentId: '22BSCS038',
    attendance: 79,
    status: 'present',
    risk: false,
    avatarBg: '#fff0c9',
    avatarText: '#d97706',
  },
];

export const STATUS_META = {
  present: { label: 'Present', color: '#16a34a', bg: '#dcfce7', icon: 'check-circle' },
  absent: { label: 'Absent', color: '#b31b25', bg: '#fde3e5', icon: 'cancel' },
  late: { label: 'Late', color: '#d97706', bg: '#fef3c7', icon: 'schedule' },
  excused: { label: 'Excused', color: '#0050d4', bg: '#dbeafe', icon: 'event-available' },
};