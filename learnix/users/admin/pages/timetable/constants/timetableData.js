export const WEEK_DAYS = [
  { id: 'mon', label: 'Mon', full: 'Monday' },
  { id: 'tue', label: 'Tue', full: 'Tuesday' },
  { id: 'wed', label: 'Wed', full: 'Wednesday' },
  { id: 'thu', label: 'Thu', full: 'Thursday' },
  { id: 'fri', label: 'Fri', full: 'Friday' },
];

export const TIMETABLE = {
  mon: [
    { id: '1', time: '9:00 - 10:00', subject: 'Data Structures', class: 'CSE-A (Sem 5)', teacher: 'Dr. Meera Iyer', room: 'A-101' },
    { id: '2', time: '10:00 - 11:00', subject: 'DBMS', class: 'CSE-A (Sem 5)', teacher: 'Dr. Sunita Rao', room: 'A-101' },
    { id: '3', time: '11:00 - 12:00', subject: 'Algorithms', class: 'CSE-B (Sem 5)', teacher: 'Dr. Meera Iyer', room: 'A-102' },
    { id: '4', time: '2:00 - 3:00', subject: 'Digital Electronics', class: 'ECE-A (Sem 3)', teacher: 'Prof. Rajesh Kumar', room: 'B-201' },
  ],
  tue: [
    { id: '5', time: '9:00 - 10:00', subject: 'Operating Systems', class: 'CSE-A (Sem 5)', teacher: 'Dr. Sunita Rao', room: 'A-101' },
    { id: '6', time: '11:00 - 12:00', subject: 'Thermodynamics', class: 'ME-A (Sem 5)', teacher: 'Prof. Anand Krishnan', room: 'C-301' },
    { id: '7', time: '2:00 - 3:00', subject: 'Marketing', class: 'BBA-A (Sem 1)', teacher: 'Dr. Kavita Desai', room: 'D-401' },
  ],
  wed: [
    { id: '8', time: '9:00 - 10:00', subject: 'Data Structures', class: 'CSE-B (Sem 5)', teacher: 'Dr. Meera Iyer', room: 'A-102' },
    { id: '9', time: '10:00 - 11:00', subject: 'Computer Networks', class: 'CSE-A (Sem 5)', teacher: 'Dr. Sunita Rao', room: 'A-101' },
    { id: '10', time: '11:00 - 12:00', subject: 'Structural Analysis', class: 'CIV-A (Sem 7)', teacher: 'Prof. Mohan Das', room: 'E-501' },
    { id: '11', time: '2:00 - 3:00', subject: 'VLSI Design', class: 'ECE-B (Sem 5)', teacher: 'Prof. Rajesh Kumar', room: 'B-202' },
  ],
  thu: [
    { id: '12', time: '9:00 - 10:00', subject: 'Operating Systems', class: 'CSE-B (Sem 5)', teacher: 'Dr. Sunita Rao', room: 'A-102' },
    { id: '13', time: '10:00 - 11:00', subject: 'Algorithms', class: 'CSE-A (Sem 5)', teacher: 'Dr. Meera Iyer', room: 'A-101' },
    { id: '14', time: '2:00 - 3:00', subject: 'Fluid Mechanics', class: 'ME-B (Sem 5)', teacher: 'Prof. Anand Krishnan', room: 'C-302' },
  ],
  fri: [
    { id: '15', time: '9:00 - 10:00', subject: 'DBMS', class: 'CSE-B (Sem 5)', teacher: 'Dr. Sunita Rao', room: 'A-102' },
    { id: '16', time: '10:00 - 11:00', subject: 'Python', class: 'CSE-A (Sem 3)', teacher: 'Prof. Sanjay Tiwari', room: 'A-201' },
    { id: '17', time: '11:00 - 12:00', subject: 'Web Development', class: 'CSE-B (Sem 3)', teacher: 'Prof. Sanjay Tiwari', room: 'A-202' },
    { id: '18', time: '2:00 - 3:00', subject: 'Organizational Behaviour', class: 'BBA-A (Sem 1)', teacher: 'Dr. Kavita Desai', room: 'D-401' },
  ],
};

export const TEACHER_ALLOCATION = [
  { id: '1', teacher: 'Dr. Meera Iyer', department: 'Computer Science', classes: 4, hours: 18, maxHours: 24, utilization: 75, color: '#7c3aed' },
  { id: '2', teacher: 'Dr. Sunita Rao', department: 'Computer Science', classes: 5, hours: 22, maxHours: 24, utilization: 92, color: '#d97706' },
  { id: '3', teacher: 'Prof. Rajesh Kumar', department: 'Electronics', classes: 3, hours: 16, maxHours: 24, utilization: 67, color: '#059669' },
  { id: '4', teacher: 'Prof. Anand Krishnan', department: 'Mechanical', classes: 3, hours: 14, maxHours: 24, utilization: 58, color: '#0891b2' },
  { id: '5', teacher: 'Dr. Kavita Desai', department: 'Management', classes: 4, hours: 20, maxHours: 24, utilization: 83, color: '#dc2626' },
  { id: '6', teacher: 'Prof. Sanjay Tiwari', department: 'Computer Science', classes: 5, hours: 23, maxHours: 24, utilization: 96, color: '#dc2626' },
];

export const CONFLICTS = [
  { id: '1', type: 'Room Conflict', description: 'Room A-101 booked twice for Friday 9:00-10:00', severity: 'High', color: '#dc2626' },
  { id: '2', type: 'Teacher Overlap', description: 'Dr. Sunita Rao scheduled in two classes at Wed 10:00', severity: 'High', color: '#dc2626' },
  { id: '3', type: 'Workload Warning', description: 'Prof. Sanjay Tiwari at 96% utilization — near limit', severity: 'Medium', color: '#d97706' },
];