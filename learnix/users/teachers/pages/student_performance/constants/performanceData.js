// Data constants for Student Performance page - Academic Curator

export const HEADER = {
  title: 'Academic Curator',
};

export const CLASS_INFO = {
  label: 'Performance Analytics',
  name: 'Advanced Calculus - Section A',
  students: 32,
  semester: 'Fall Semester 2024',
};

export const OVERVIEW = {
  classAverage: {
    value: 84.2,
    trend: '+2.4%',
    chartData: [40, 55, 45, 70, 65, 80, 95],
  },
  attendanceRate: {
    value: 92,
    label: 'Attendance Rate',
  },
  participation: {
    value: 7.8,
    max: 10,
    label: 'Participation',
  },
};

export const FILTERS = [
  { id: 'all', label: 'All Students (32)' },
  { id: 'top', label: 'Top Performers (12)' },
  { id: 'consistent', label: 'Consistent (14)' },
  { id: 'support', label: 'Needs Support (6)' },
];

export const STUDENTS = [
  {
    id: 'JS',
    name: 'Julianna Sterling',
    rank: 1,
    grade: 98,
    status: 'Optimal',
    statusColor: '#16a34a',
    statusBg: '#dcfce7',
    avatarBg: '#dcc9ff',
    avatarText: '#5b00c7',
    trend: [66, 75, 100],
    trendColor: '#0050d4',
    keyDriver: 'Strong Quiz Performance',
    driverColor: '#702ae1',
  },
  {
    id: 'MK',
    name: 'Marcus Kinsley',
    rank: 28,
    grade: 64,
    status: 'At Risk',
    statusColor: '#b31b25',
    statusBg: '#fee2e2',
    avatarBg: '#ff956a',
    avatarText: '#5a1c00',
    trend: [100, 66, 50],
    trendColor: '#a23800',
    keyDriver: 'Missing Assignments',
    driverColor: '#a23800',
  },
  {
    id: 'AL',
    name: 'Aria Lopez',
    rank: 14,
    grade: 81,
    status: 'Caution',
    statusColor: '#ca8a04',
    statusBg: '#fef3c7',
    avatarBg: '#7b9cff',
    avatarText: '#001e5a',
    trend: [50, 100, 75],
    trendColor: '#702ae1',
    keyDriver: 'Inconsistent Attendance',
    driverColor: '#0050d4',
  },
];

export const GAP_ANALYSIS = [
  {
    id: 'integration',
    topic: 'Integration by Parts',
    mastery: 45,
    color: '#a23800',
    note: 'Common error: Constant of integration',
  },
  {
    id: 'trig',
    topic: 'Trig Substitution',
    mastery: 68,
    color: '#0050d4',
    note: 'Improving: Last quiz showed 12% growth',
  },
  {
    id: 'limits',
    topic: 'Limit Laws',
    mastery: 89,
    color: '#702ae1',
    note: '',
  },
];

export const AI_SUGGESTIONS = [
  {
    id: 'suggestion1',
    text: '"Schedule a remedial session for Topic 4 (Integration by Parts) this Friday. 12 students are struggling with the algebraic manipulation."',
    action: 'Create Event',
    color: '#702ae1',
  },
  {
    id: 'suggestion2',
    text: '"Assign peer-mentoring groups. Julianna S. and Marcus K. show complementary strengths in Problem Set #3."',
    action: 'Draft Groupings',
    color: '#0050d4',
  },
];
