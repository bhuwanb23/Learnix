export const REPORT_STATS = [
  { id: 'students', label: 'Total Students', value: '1,234', icon: 'people', color: '#7c3aed', trend: '+8.2% vs last year' },
  { id: 'pass-rate', label: 'Overall Pass Rate', value: '87.4%', icon: 'checkmark-done', color: '#059669', trend: '+2.1% vs last year' },
  { id: 'attendance', label: 'Avg Attendance', value: '94.2%', icon: 'calendar', color: '#d97706', trend: '-0.8% vs last term' },
  { id: 'placements', label: 'Placement Rate', value: '92.1%', icon: 'briefcase', color: '#0284c7', trend: '+5.3% vs last year' },
];

export const CLASS_REPORTS = [
  { id: 'C1', name: 'CSE-A (Sem 5)', students: 62, attendance: 95, passRate: 91, avgCgpa: 8.2, teacher: 'Dr. Meera Iyer', color: '#7c3aed' },
  { id: 'C2', name: 'CSE-B (Sem 5)', students: 58, attendance: 92, passRate: 87, avgCgpa: 7.9, teacher: 'Dr. Sunita Rao', color: '#8b5cf6' },
  { id: 'C3', name: 'ECE-A (Sem 3)', students: 60, attendance: 94, passRate: 89, avgCgpa: 8.0, teacher: 'Prof. Rajesh Kumar', color: '#059669' },
  { id: 'C4', name: 'ME-A (Sem 5)', students: 55, attendance: 88, passRate: 82, avgCgpa: 7.4, teacher: 'Prof. Anand Krishnan', color: '#d97706' },
  { id: 'C5', name: 'BBA-A (Sem 1)', students: 48, attendance: 91, passRate: 93, avgCgpa: 8.5, teacher: 'Dr. Kavita Desai', color: '#dc2626' },
  { id: 'C6', name: 'CIV-A (Sem 7)', students: 44, attendance: 90, passRate: 85, avgCgpa: 7.7, teacher: 'Prof. Mohan Das', color: '#0891b2' },
];

export const EXPORT_OPTIONS = [
  { id: 'students-list', label: 'Student Master List', desc: 'All enrolled students with contact & program details', icon: 'people', color: '#7c3aed' },
  { id: 'attendance-report', label: 'Attendance Report', desc: 'Month-wise attendance for all classes', icon: 'calendar', color: '#059669' },
  { id: 'marks-statement', label: 'Marks Statements', desc: 'Semester marks for all programs', icon: 'document-text', color: '#d97706' },
  { id: 'fee-report', label: 'Fee Collection Report', desc: 'Collections, dues & receipts summary', icon: 'cash', color: '#0284c7' },
  { id: 'placement-report', label: 'Placement Report', desc: 'Drive results & offer statistics', icon: 'briefcase', color: '#dc2626' },
  { id: 'library-report', label: 'Library Report', desc: 'Issues, returns & fine collections', icon: 'book', color: '#0891b2' },
];