export const RESULT_STATS = [
  { id: 'pending', label: 'Pending Publish', value: '6', icon: 'time', color: '#d97706' },
  { id: 'published', label: 'Published', value: '18', icon: 'checkmark-done', color: '#059669' },
  { id: 'revaluation', label: 'Revaluations', value: '12', icon: 'refresh', color: '#2563eb' },
  { id: 'passRate', label: 'Avg Pass Rate', value: '87%', icon: 'trending-up', color: '#0284c7' },
];

export const RESULTS_PENDING = [
  { id: 'RP1', subject: 'Data Structures', code: 'CS301', sem: 'Sem 3', examDate: 'Dec 15', graded: 180, total: 180, due: 'Dec 20', color: '#2563eb' },
  { id: 'RP2', subject: 'Operating Systems', code: 'CS302', sem: 'Sem 3', examDate: 'Dec 16', graded: 156, total: 156, due: 'Dec 21', color: '#059669' },
  { id: 'RP3', subject: 'DBMS', code: 'CS303', sem: 'Sem 3', examDate: 'Dec 17', graded: 168, total: 168, due: 'Dec 22', color: '#d97706' },
  { id: 'RP4', subject: 'Computer Networks', code: 'CS304', sem: 'Sem 3', examDate: 'Dec 18', graded: 144, total: 144, due: 'Dec 23', color: '#0284c7' },
  { id: 'RP5', subject: 'Software Engineering', code: 'CS305', sem: 'Sem 3', examDate: 'Dec 19', graded: 172, total: 172, due: 'Dec 24', color: '#dc2626' },
  { id: 'RP6', subject: 'Mathematics III', code: 'MA301', sem: 'Sem 3', examDate: 'Dec 20', graded: 185, total: 185, due: 'Dec 25', color: '#4f46e5' },
];

export const RESULTS_PUBLISHED = [
  { id: 'RD1', subject: 'Physics II', code: 'PH202', sem: 'Sem 2', published: 'Dec 2', passRate: '91%', color: '#059669' },
  { id: 'RD2', subject: 'Chemistry II', code: 'CH202', sem: 'Sem 2', published: 'Dec 3', passRate: '84%', color: '#059669' },
  { id: 'RD3', subject: 'Mathematics II', code: 'MA202', sem: 'Sem 2', published: 'Dec 4', passRate: '88%', color: '#059669' },
];

export const REVALUATION_REQUESTS = [
  { id: 'RV1', student: 'Aarav Mehta', subject: 'DBMS', requested: 'Dec 6', reason: 'Believes 4 marks under-totaled', status: 'Pending', color: '#2563eb' },
  { id: 'RV2', student: 'Isha Gupta', subject: 'Software Engineering', requested: 'Dec 5', reason: 'Question 3 mismatch with answer key', status: 'In Review', color: '#d97706' },
  { id: 'RV3', student: 'Rohan Verma', subject: 'Computer Networks', requested: 'Dec 4', reason: 'Answer sheet photo unclear', status: 'Resolved', color: '#059669' },
];