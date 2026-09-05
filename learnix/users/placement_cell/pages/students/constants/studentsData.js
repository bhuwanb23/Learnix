export const STUDENT_STATS = [
  { id: 'total', label: 'Registered Students', value: '2,840', icon: 'people', color: '#2563eb' },
  { id: 'eligible', label: 'Placement Eligible', value: '1,624', icon: 'checkmark-circle', color: '#059669' },
  { id: 'placed', label: 'Placed', value: '231', icon: 'ribbon', color: '#0284c7' },
  { id: 'inProcess', label: 'In Process', value: '486', icon: 'time', color: '#d97706' },
];

export const STUDENTS = [
  { id: 'ST1', name: 'Ananya Reddy', rollNo: 'CSE-23-005', branch: 'CSE', year: '3rd', cgpa: 8.9, status: 'In Process', applied: 3, avatarColor: '#2563eb' },
  { id: 'ST2', name: 'Aarav Mehta', rollNo: 'CSE-21-001', branch: 'CSE', year: '4th', cgpa: 8.4, status: 'In Process', applied: 5, avatarColor: '#059669' },
  { id: 'ST3', name: 'Priya Sharma', rollNo: 'ECE-21-014', branch: 'ECE', year: '4th', cgpa: 8.7, status: 'Placed', applied: 4, avatarColor: '#d97706' },
  { id: 'ST4', name: 'Arjun Nair', rollNo: 'CIV-21-011', branch: 'CIVIL', year: '4th', cgpa: 7.9, status: 'Eligible', applied: 1, avatarColor: '#0284c7' },
  { id: 'ST5', name: 'Isha Gupta', rollNo: 'ECE-23-019', branch: 'ECE', year: '3rd', cgpa: 8.2, status: 'In Process', applied: 2, avatarColor: '#dc2626' },
  { id: 'ST6', name: 'Rohan Verma', rollNo: 'CSE-22-008', branch: 'CSE', year: '4th', cgpa: 8.1, status: 'Eligible', applied: 0, avatarColor: '#0891b2' },
  { id: 'ST7', name: 'Sneha Kulkarni', rollNo: 'ME-21-004', branch: 'MECH', year: '4th', cgpa: 8.6, status: 'Placed', applied: 3, avatarColor: '#4f46e5' },
  { id: 'ST8', name: 'Kabir Singh', rollNo: 'BBA-22-010', branch: 'BBA', year: '3rd', cgpa: 7.6, status: 'Eligible', applied: 0, avatarColor: '#0ea5e9' },
  { id: 'ST9', name: 'Meera Krishnan', rollNo: 'CSE-21-016', branch: 'CSE', year: '4th', cgpa: 9.1, status: 'In Process', applied: 6, avatarColor: '#059669' },
  { id: 'ST10', name: 'Dev Patel', rollNo: 'ECE-22-003', branch: 'ECE', year: '4th', cgpa: 7.2, status: 'Eligible', applied: 0, avatarColor: '#d97706' },
];

export const BRANCH_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'CSE', value: 'CSE' },
  { label: 'ECE', value: 'ECE' },
  { label: 'MECH', value: 'MECH' },
  { label: 'CIVIL', value: 'CIVIL' },
  { label: 'BBA', value: 'BBA' },
];

export const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Placed', value: 'Placed' },
  { label: 'In Process', value: 'In Process' },
  { label: 'Eligible', value: 'Eligible' },
];