export const DEPARTMENTS = [
  { id: 'CS', name: 'Computer Science', code: 'CS', programs: 3, students: 410, hod: 'Dr. Meera Iyer', color: '#2563eb' },
  { id: 'EC', name: 'Electronics', code: 'EC', programs: 2, students: 240, hod: 'Prof. Rajesh Kumar', color: '#059669' },
  { id: 'ME', name: 'Mechanical', code: 'ME', programs: 2, students: 180, hod: 'Prof. Anand Krishnan', color: '#d97706' },
  { id: 'MG', name: 'Management', code: 'MG', programs: 3, students: 260, hod: 'Dr. Kavita Desai', color: '#dc2626' },
  { id: 'CV', name: 'Civil', code: 'CV', programs: 1, students: 144, hod: 'Prof. Mohan Das', color: '#0891b2' },
];

export const PROGRAMS = [
  { id: 'P1', name: 'B.Tech CSE', department: 'Computer Science', duration: '4 Years', semesters: 8, students: 410, type: 'Undergraduate', color: '#2563eb' },
  { id: 'P2', name: 'M.Tech CSE', department: 'Computer Science', duration: '2 Years', semesters: 4, students: 60, type: 'Postgraduate', color: '#3b82f6' },
  { id: 'P3', name: 'B.Tech ECE', department: 'Electronics', duration: '4 Years', semesters: 8, students: 240, type: 'Undergraduate', color: '#059669' },
  { id: 'P4', name: 'B.Tech ME', department: 'Mechanical', duration: '4 Years', semesters: 8, students: 180, type: 'Undergraduate', color: '#d97706' },
  { id: 'P5', name: 'BBA', department: 'Management', duration: '3 Years', semesters: 6, students: 180, type: 'Undergraduate', color: '#dc2626' },
  { id: 'P6', name: 'MBA', department: 'Management', duration: '2 Years', semesters: 4, students: 80, type: 'Postgraduate', color: '#ef4444' },
  { id: 'P7', name: 'B.Tech CE', department: 'Civil', duration: '4 Years', semesters: 8, students: 144, type: 'Undergraduate', color: '#0891b2' },
];

export const COURSES = [
  { id: 'C1', name: 'Data Structures', code: 'CS301', department: 'Computer Science', program: 'B.Tech CSE', semester: 5, credits: 4, teacher: 'Dr. Meera Iyer', color: '#2563eb' },
  { id: 'C2', name: 'Operating Systems', code: 'CS302', department: 'Computer Science', program: 'B.Tech CSE', semester: 5, credits: 4, teacher: 'Dr. Sunita Rao', color: '#3b82f6' },
  { id: 'C3', name: 'Digital Electronics', code: 'EC301', department: 'Electronics', program: 'B.Tech ECE', semester: 5, credits: 3, teacher: 'Prof. Rajesh Kumar', color: '#059669' },
  { id: 'C4', name: 'Thermodynamics', code: 'ME301', department: 'Mechanical', program: 'B.Tech ME', semester: 5, credits: 4, teacher: 'Prof. Anand Krishnan', color: '#d97706' },
  { id: 'C5', name: 'Marketing Management', code: 'MG201', department: 'Management', program: 'BBA', semester: 3, credits: 3, teacher: 'Dr. Kavita Desai', color: '#dc2626' },
  { id: 'C6', name: 'Structural Analysis', code: 'CV301', department: 'Civil', program: 'B.Tech CE', semester: 5, credits: 4, teacher: 'Prof. Mohan Das', color: '#0891b2' },
  { id: 'C7', name: 'DBMS', code: 'CS304', department: 'Computer Science', program: 'B.Tech CSE', semester: 5, credits: 4, teacher: 'Dr. Sunita Rao', color: '#2563eb' },
  { id: 'C8', name: 'Computer Networks', code: 'CS305', department: 'Computer Science', program: 'B.Tech CSE', semester: 5, credits: 3, teacher: 'Dr. Sunita Rao', color: '#059669' },
];

export const COURSE_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Computer Science', value: 'Computer Science' },
  { label: 'Electronics', value: 'Electronics' },
  { label: 'Mechanical', value: 'Mechanical' },
  { label: 'Management', value: 'Management' },
  { label: 'Civil', value: 'Civil' },
];

export const SYLLABUS_TEMPLATES = [
  { id: 'S1', name: 'Data Structures Syllabus', program: 'B.Tech CSE', semester: 5, units: 5, updatedAt: 'Jun 2026', status: 'Approved', color: '#2563eb' },
  { id: 'S2', name: 'Operating Systems Syllabus', program: 'B.Tech CSE', semester: 5, units: 6, updatedAt: 'Jun 2026', status: 'Approved', color: '#3b82f6' },
  { id: 'S3', name: 'Thermodynamics Syllabus', program: 'B.Tech ME', semester: 5, units: 5, updatedAt: 'May 2026', status: 'Draft', color: '#d97706' },
  { id: 'S4', name: 'Marketing Syllabus', program: 'BBA', semester: 3, units: 4, updatedAt: 'May 2026', status: 'Approved', color: '#dc2626' },
  { id: 'S5', name: 'DBMS Syllabus', program: 'B.Tech CSE', semester: 5, units: 5, updatedAt: 'Jun 2026', status: 'Draft', color: '#059669' },
];