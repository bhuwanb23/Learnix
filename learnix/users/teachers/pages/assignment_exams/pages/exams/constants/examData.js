// Data constants for the exam list page - teacher view

export const EXAM_HEADER = {
  title: 'Exams',
  subtitle: 'Schedule and manage exams',
};

export const EXAM_TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
];

export const EXAMS = [
  {
    id: 'midterm-calc',
    title: 'Midterm Examination',
    subject: 'Advanced Calculus',
    classCode: 'CAL-101',
    date: 'Oct 25',
    time: '10:00 – 12:00',
    room: 'Room B-204',
    duration: '120 min',
    status: 'upcoming',
    results: null,
    color: '#0050d4',
  },
  {
    id: 'quiz2-phy',
    title: 'Quiz 2',
    subject: 'Theoretical Physics',
    classCode: 'PHY-210',
    date: 'Oct 18',
    time: '09:00 – 10:00',
    room: 'Room A-112',
    duration: '60 min',
    status: 'upcoming',
    results: null,
    color: '#702ae1',
  },
  {
    id: 'unit1-psy',
    title: 'Unit Test 1',
    subject: 'Advanced Cognitive Psychology',
    classCode: 'PSY-402',
    date: 'Oct 2',
    time: '10:00 – 11:30',
    room: 'Room C-301',
    duration: '90 min',
    status: 'past',
    results: 'published',
    avgGrade: 82,
    color: '#16a34a',
  },
  {
    id: 'midterm-phy',
    title: 'Midterm Examination',
    subject: 'Theoretical Physics',
    classCode: 'PHY-210',
    date: 'Sep 20',
    time: '09:00 – 12:00',
    room: 'Room A-112',
    duration: '180 min',
    status: 'past',
    results: 'draft',
    avgGrade: null,
    color: '#d97706',
  },
];