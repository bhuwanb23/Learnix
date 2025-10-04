export const SYLLABUS_TABS = [
  { id: 'byClass', label: 'By Class' },
  { id: 'bySubject', label: 'By Subject' },
  { id: 'byGroup', label: 'By Group' },
];

export const SUBJECTS_DATA = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    grade: 'Grade 10A',
    progress: 100,
    status: 'Completed',
    chaptersCompleted: 8,
    totalChapters: 8,
    dueDate: 'Dec 15',
    icon: '🧮',
    color: '#10B981',
    backgroundColor: '#DCFCE7',
    chapters: [
      { id: 1, name: 'Algebra Basics', completed: true },
      { id: 2, name: 'Geometry', completed: true },
      { id: 3, name: 'Trigonometry', completed: true },
      { id: 4, name: 'Calculus', completed: true },
      { id: 5, name: 'Statistics', completed: true },
      { id: 6, name: 'Probability', completed: true },
      { id: 7, name: 'Functions', completed: true },
      { id: 8, name: 'Advanced Topics', completed: true },
    ]
  },
  {
    id: 'physics',
    name: 'Physics',
    grade: 'Grade 10A',
    progress: 85,
    status: 'In Progress',
    chaptersCompleted: 6,
    totalChapters: 7,
    dueDate: 'Dec 20',
    icon: '⚛️',
    color: '#3B82F6',
    backgroundColor: '#DBEAFE',
    chapters: [
      { id: 1, name: 'Motion', completed: true, current: false },
      { id: 2, name: 'Forces', completed: true, current: false },
      { id: 3, name: 'Energy', completed: true, current: false },
      { id: 4, name: 'Momentum', completed: true, current: false },
      { id: 5, name: 'Waves', completed: true, current: false },
      { id: 6, name: 'Electricity', completed: true, current: false },
      { id: 7, name: 'Waves', completed: false, current: true },
    ]
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    grade: 'Grade 10A',
    progress: 45,
    status: 'Behind Schedule',
    chaptersCompleted: 3,
    totalChapters: 8,
    dueDate: 'Dec 18',
    icon: '🧪',
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    chapters: [
      { id: 1, name: 'Atomic Structure', completed: true },
      { id: 2, name: 'Chemical Bonding', completed: true },
      { id: 3, name: 'Stoichiometry', completed: true },
      { id: 4, name: 'Acids and Bases', completed: false },
      { id: 5, name: 'Organic Chemistry', completed: false },
      { id: 6, name: 'Thermodynamics', completed: false },
      { id: 7, name: 'Electrochemistry', completed: false },
      { id: 8, name: 'Nuclear Chemistry', completed: false },
    ]
  },
  {
    id: 'biology',
    name: 'Biology',
    grade: 'Grade 10A',
    progress: 0,
    status: 'Not Started',
    chaptersCompleted: 0,
    totalChapters: 6,
    dueDate: 'Dec 25',
    icon: '🧬',
    color: '#8B5CF6',
    backgroundColor: '#F3E8FF',
    chapters: [
      { id: 1, name: 'Cell Biology', completed: false },
      { id: 2, name: 'Genetics', completed: false },
      { id: 3, name: 'Evolution', completed: false },
      { id: 4, name: 'Ecology', completed: false },
      { id: 5, name: 'Human Anatomy', completed: false },
      { id: 6, name: 'Plant Biology', completed: false },
    ]
  }
];

export const AI_REMINDERS = [
  {
    id: 'chemistry-alert',
    type: 'warning',
    title: 'AI Alert',
    message: 'Chemistry Chapter 5 is 3 days behind schedule',
    subject: 'Chemistry',
    chapter: 'Chapter 5',
    daysBehind: 3,
    priority: 'high'
  }
];

export const OVERALL_STATS = {
  totalProgress: 73,
  timeRemaining: '4 weeks',
  subjectsCompleted: 12,
  totalSubjects: 16,
  onTrack: 3,
  behind: 1,
  notStarted: 1
};

export const getProgressColor = (progress) => {
  if (progress === 100) return '#10B981';
  if (progress >= 80) return '#3B82F6';
  if (progress >= 50) return '#F59E0B';
  if (progress > 0) return '#F59E0B';
  return '#6B7280';
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'Completed': return '#10B981';
    case 'In Progress': return '#3B82F6';
    case 'Behind Schedule': return '#F59E0B';
    case 'Not Started': return '#6B7280';
    default: return '#6B7280';
  }
};

export const getStatusText = (progress) => {
  if (progress === 100) return 'Completed';
  if (progress >= 80) return 'In Progress';
  if (progress >= 50) return 'Behind Schedule';
  if (progress > 0) return 'Behind Schedule';
  return 'Not Started';
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
};

export const calculateDaysRemaining = (dueDate) => {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};
