export const EXAM_STATS = [
  { id: 'activeExams', label: 'Active Exams', value: '12', icon: 'calendar', color: '#2563eb' },
  { id: 'pendingEval', label: 'Pending Evaluations', value: '97', icon: 'clipboard', color: '#d97706' },
  { id: 'results', label: 'Results Pending', value: '6', icon: 'trophy', color: '#059669' },
  { id: 'cheating', label: 'Cheating Cases', value: '5', icon: 'warning', color: '#dc2626' },
];

export const TODAY_EXAMS = [
  { id: 'E1', time: '9:00 AM', subject: 'Data Structures', code: 'CS301', room: 'Block A • Rooms 101-104', students: 180, invigilator: 'Dr. R. Menon', color: '#2563eb' },
  { id: 'E2', time: '11:30 AM', subject: 'Operating Systems', code: 'CS302', room: 'Block B • Rooms 201-203', students: 156, invigilator: 'Prof. S. Iyer', color: '#059669' },
  { id: 'E3', time: '2:00 PM', subject: 'DBMS', code: 'CS303', room: 'Block A • Rooms 105-107', students: 168, invigilator: 'Dr. K. Nair', color: '#d97706' },
];

export const PENDING_TASKS = [
  { id: 'T1', title: 'Publish Semester 3 results', detail: '5 subjects awaiting approval', icon: 'trophy-outline', color: '#2563eb', target: 'Results' },
  { id: 'T2', title: 'Generate hall tickets', detail: 'Semester 4 finals • Dec 18', icon: 'ticket-outline', color: '#059669', target: 'HallTickets' },
  { id: 'T3', title: 'Review 3 cheating alerts', detail: 'AI detected • High priority', icon: 'warning-outline', color: '#dc2626', target: 'CheatingCases' },
  { id: 'T4', title: 'Evaluate Chemistry papers', detail: '128 papers pending grading', icon: 'clipboard-outline', color: '#d97706', target: 'Evaluations' },
];

export const MODULES = [
  { id: 'Timetable', label: 'Exam Timetable', desc: 'Schedule exams & allocate rooms', icon: 'calendar-outline', color: '#2563eb' },
  { id: 'Evaluations', label: 'Evaluations', desc: 'Track grading progress', icon: 'clipboard-outline', color: '#059669' },
  { id: 'Results', label: 'Results', desc: 'Publish & moderate results', icon: 'trophy-outline', color: '#d97706' },
  { id: 'HallTickets', label: 'Hall Tickets', desc: 'Issue & verify admit cards', icon: 'ticket-outline', color: '#0284c7' },
  { id: 'CheatingCases', label: 'Cheating Cases', desc: 'Review AI-detected alerts', icon: 'warning-outline', color: '#dc2626' },
  { id: 'Notifications', label: 'Notify Students', desc: 'Broadcast exam updates', icon: 'megaphone-outline', color: '#4f46e5' },
];

export const RECENT_ACTIVITY = [
  { id: 'A1', text: 'Semester 3 Math results published', time: '20 min ago', color: '#059669' },
  { id: 'A2', text: 'Hall tickets generated for 410 students', time: '1 hr ago', color: '#2563eb' },
  { id: 'A3', text: 'New cheating alert — Chemistry final', time: '2 hrs ago', color: '#dc2626' },
  { id: 'A4', text: 'Physics papers fully evaluated by Prof. Iyer', time: '4 hrs ago', color: '#059669' },
];