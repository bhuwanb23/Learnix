export const EVALUATION_STATS = [
  { id: 'completed', label: 'Completed', value: '847', icon: 'checkmark-done', color: '#059669' },
  { id: 'inProgress', label: 'In Progress', value: '156', icon: 'time', color: '#d97706' },
  { id: 'pending', label: 'Pending', value: '97', icon: 'clipboard', color: '#2563eb' },
  { id: 'total', label: 'Total Papers', value: '1,100', icon: 'document-text', color: '#0284c7' },
];

export const SUBJECT_PROGRESS = [
  { id: 'SP1', subject: 'Data Structures', code: 'CS301', total: 180, graded: 166, evaluator: 'Dr. R. Menon', status: 'On Track', color: '#059669' },
  { id: 'SP2', subject: 'Operating Systems', code: 'CS302', total: 156, graded: 121, evaluator: 'Prof. S. Iyer', status: 'On Track', color: '#059669' },
  { id: 'SP3', subject: 'DBMS', code: 'CS303', total: 168, graded: 109, evaluator: 'Dr. K. Nair', status: 'At Risk', color: '#d97706' },
  { id: 'SP4', subject: 'Computer Networks', code: 'CS304', total: 144, graded: 88, evaluator: 'Prof. A. Rao', status: 'At Risk', color: '#d97706' },
  { id: 'SP5', subject: 'Software Engineering', code: 'CS305', total: 172, graded: 52, evaluator: 'Dr. P. Sharma', status: 'Overdue', color: '#dc2626' },
  { id: 'SP6', subject: 'Mathematics III', code: 'MA301', total: 185, graded: 170, evaluator: 'Dr. R. Menon', status: 'On Track', color: '#059669' },
];

export const DISPUTES = [
  { id: 'D1', student: 'Aarav Mehta', subject: 'DBMS', issue: 'Marks totalling error — claims 4 marks missing', date: 'Dec 6', color: '#2563eb' },
  { id: 'D2', student: 'Isha Gupta', subject: 'Software Engineering', issue: 'Question 3 marked wrong but answer matches key', date: 'Dec 5', color: '#d97706' },
];