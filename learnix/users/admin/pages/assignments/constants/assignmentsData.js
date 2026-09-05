export const ASSIGNMENT_STATS = [
  { id: 'total', label: 'Active Assignments', value: '24', icon: 'document-text', color: '#2563eb' },
  { id: 'submitted', label: 'Submissions', value: '1,842', icon: 'cloud-upload', color: '#059669' },
  { id: 'graded', label: 'Pending Grading', value: '312', icon: 'time', color: '#d97706' },
  { id: 'flagged', label: 'Plagiarism Flags', value: '7', icon: 'warning', color: '#dc2626' },
];

export const RECENT_SUBMISSIONS = [
  { id: 'S1', student: 'Aarav Mehta', rollNo: 'CSE-21-001', assignment: 'Data Structures — Assignment 3', subject: 'Data Structures', submittedAt: '2 hrs ago', status: 'Graded', score: 92, color: '#2563eb' },
  { id: 'S2', student: 'Priya Sharma', rollNo: 'ECE-21-014', assignment: 'Digital Electronics — Lab Report', subject: 'Digital Electronics', submittedAt: '3 hrs ago', status: 'Pending', score: null, color: '#059669' },
  { id: 'S3', student: 'Rahul Verma', rollNo: 'MEC-22-008', assignment: 'Thermodynamics — Problem Set', subject: 'Thermodynamics', submittedAt: '5 hrs ago', status: 'Pending', score: null, color: '#d97706' },
  { id: 'S4', student: 'Sneha Patel', rollNo: 'BBA-23-003', assignment: 'Marketing — Case Study', subject: 'Marketing', submittedAt: 'Yesterday', status: 'Graded', score: 88, color: '#dc2626' },
  { id: 'S5', student: 'Vikram Singh', rollNo: 'CSE-22-021', assignment: 'DBMS — ER Design', subject: 'DBMS', submittedAt: 'Yesterday', status: 'Flagged', score: null, color: '#dc2626' },
];

export const PLAGIARISM_CASES = [
  { id: 'P1', student: 'Vikram Singh', rollNo: 'CSE-22-021', assignment: 'DBMS — ER Design', similarity: 87, source: 'Online repository', status: 'Under Review', color: '#dc2626' },
  { id: 'P2', student: 'Rahul Verma', rollNo: 'MEC-22-008', assignment: 'Thermodynamics — Problem Set', similarity: 64, source: 'Classmate (S1)', status: 'Under Review', color: '#d97706' },
  { id: 'P3', student: 'Isha Gupta', rollNo: 'ECE-23-019', assignment: 'Signals — Lab Report', similarity: 51, source: 'Online repository', status: 'Under Review', color: '#d97706' },
  { id: 'P4', student: 'Kabir Joshi', rollNo: 'CSE-24-001', assignment: 'Python — Mini Project', similarity: 78, source: 'GitHub project', status: 'Confirmed', color: '#dc2626' },
];