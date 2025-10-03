// Class page data constants for Teacher view

export const TIMETABLE = {
  dateLabel: "Friday, October 25, 2024",
  title: "Today's Schedule",
  items: [
    {
      id: 'current',
      subject: 'Data Structures',
      time: '9:00 AM - 10:30 AM',
      color: '#FACC15',
      status: { label: 'Current', bg: '#4ADE80', text: '#14532D' },
      variant: 'highlight',
    },
    {
      id: 'next',
      subject: 'Algorithms Lab',
      time: '11:00 AM - 12:30 PM',
      color: '#93C5FD',
      status: null,
      variant: 'subtle',
    },
  ],
};

export const QUICK_ACTIONS = [
  { id: 'attendance', label: 'Mark Attendance', bg: '#22C55E', icon: '✅' },
  { id: 'upload', label: 'Upload Notes', bg: '#3B82F6', icon: '⬆️' },
];

export const SYLLABUS = {
  overall: 68,
  items: [
    { id: 'intro', label: 'Introduction to Programming', percent: 100, color: '#22C55E' },
    { id: 'ds', label: 'Data Structures', percent: 75, color: '#2563EB' },
    { id: 'algo', label: 'Algorithms', percent: 45, color: '#F97316' },
  ],
};

export const PENDING_TASKS = {
  count: 2,
  items: [
    { id: 'sorting', title: 'Complete Sorting Algorithms', due: 'Oct 28, 2024', color: '#F87171' },
    { id: 'lab3', title: 'Submit Lab Report #3', due: 'Oct 30, 2024', color: '#FB923C' },
  ],
};

export const NAV_BUTTONS = [
  { id: 'syllabus', title: 'Syllabus Progress', tint: '#A78BFA', text: '#7C3AED', icon: '📈' },
  { id: 'ai', title: 'AI Suggestions', tint: '#FBCFE8', text: '#DB2777', icon: '🧠' },
];

export const RECENT_ACTIVITY = [
  { id: 'attended', title: 'Attended Data Structures Lecture', time: '2 hours ago', tint: '#DCFCE7', text: '#16A34A', icon: '✔️' },
  { id: 'uploaded', title: 'Uploaded Lecture Notes', time: 'Yesterday', tint: '#DBEAFE', text: '#2563EB', icon: '📤' },
];


