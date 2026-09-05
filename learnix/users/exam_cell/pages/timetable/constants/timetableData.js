export const TIMETABLE_STATS = [
  { id: 'exams', label: 'Scheduled Exams', value: '38', icon: 'calendar', color: '#2563eb' },
  { id: 'students', label: 'Students Covered', value: '1,240', icon: 'people', color: '#059669' },
  { id: 'rooms', label: 'Rooms Allocated', value: '14', icon: 'business', color: '#d97706' },
  { id: 'conflicts', label: 'Conflicts', value: '2', icon: 'warning', color: '#dc2626' },
];

export const EXAMS = [
  { id: 'EX1', subject: 'Data Structures', code: 'CS301', sem: 'Sem 3', date: 'Dec 15, 2026', time: '9:00 AM - 12:00 PM', room: 'Block A • Rooms 101-104', students: 180, invigilators: 4, status: 'Scheduled', color: '#2563eb' },
  { id: 'EX2', subject: 'Operating Systems', code: 'CS302', sem: 'Sem 3', date: 'Dec 16, 2026', time: '9:00 AM - 12:00 PM', room: 'Block B • Rooms 201-203', students: 156, invigilators: 3, status: 'Scheduled', color: '#059669' },
  { id: 'EX3', subject: 'DBMS', code: 'CS303', sem: 'Sem 3', date: 'Dec 17, 2026', time: '9:00 AM - 12:00 PM', room: 'Block A • Rooms 105-107', students: 168, invigilators: 4, status: 'Scheduled', color: '#d97706' },
  { id: 'EX4', subject: 'Computer Networks', code: 'CS304', sem: 'Sem 3', date: 'Dec 18, 2026', time: '9:00 AM - 12:00 PM', room: 'Block B • Rooms 204-206', students: 144, invigilators: 3, status: 'Scheduled', color: '#0284c7' },
  { id: 'EX5', subject: 'Software Engineering', code: 'CS305', sem: 'Sem 3', date: 'Dec 19, 2026', time: '9:00 AM - 12:00 PM', room: 'Block A • Rooms 101-104', students: 172, invigilators: 4, status: 'Conflict', color: '#dc2626' },
  { id: 'EX6', subject: 'Mathematics III', code: 'MA301', sem: 'Sem 3', date: 'Dec 20, 2026', time: '9:00 AM - 12:00 PM', room: 'Block C • Rooms 301-303', students: 185, invigilators: 4, status: 'Scheduled', color: '#4f46e5' },
];

export const ROOMS = [
  { id: 'R1', name: 'Block A • 101-104', capacity: 200, status: 'Allocated', color: '#2563eb' },
  { id: 'R2', name: 'Block A • 105-107', capacity: 180, status: 'Allocated', color: '#2563eb' },
  { id: 'R3', name: 'Block B • 201-203', capacity: 160, status: 'Allocated', color: '#059669' },
  { id: 'R4', name: 'Block B • 204-206', capacity: 150, status: 'Free', color: '#64748b' },
  { id: 'R5', name: 'Block C • 301-303', capacity: 200, status: 'Allocated', color: '#d97706' },
];

export const INVIGILATORS = [
  { id: 'I1', name: 'Dr. R. Menon', department: 'CSE', exams: 4, color: '#2563eb' },
  { id: 'I2', name: 'Prof. S. Iyer', department: 'ECE', exams: 3, color: '#059669' },
  { id: 'I3', name: 'Dr. K. Nair', department: 'MECH', exams: 3, color: '#d97706' },
  { id: 'I4', name: 'Prof. A. Rao', department: 'CSE', exams: 2, color: '#0284c7' },
  { id: 'I5', name: 'Dr. P. Sharma', department: 'MATHS', exams: 2, color: '#4f46e5' },
];

export const CONFLICTS = [
  { id: 'C1', subject: 'Software Engineering', issue: 'Room overlap with CS303 retake', severity: 'High', color: '#dc2626' },
  { id: 'C2', subject: 'Mathematics III', issue: 'Invigilator Dr. Nair double-booked', severity: 'Medium', color: '#d97706' },
];