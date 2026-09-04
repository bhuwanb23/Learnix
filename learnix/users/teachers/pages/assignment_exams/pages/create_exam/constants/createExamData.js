// Data constants for the create exam page - teacher view

export const CREATE_EXAM_HEADER = {
  title: 'Schedule Exam',
  subtitle: 'Plan an exam and its schedule',
};

export const EXAM_FORM_FIELDS = [
  { key: 'title', label: 'Exam Title', placeholder: 'e.g. Midterm Examination', icon: 'fact-check', required: true },
  { key: 'date', label: 'Date', placeholder: 'e.g. Oct 25', icon: 'calendar-today', required: true },
  { key: 'startTime', label: 'Start Time', placeholder: 'e.g. 10:00', icon: 'schedule', required: true },
  { key: 'endTime', label: 'End Time', placeholder: 'e.g. 12:00', icon: 'schedule', required: true },
  { key: 'room', label: 'Room', placeholder: 'e.g. Room B-204', icon: 'meeting-room', required: true },
  { key: 'maxMarks', label: 'Max Marks', placeholder: 'e.g. 100', icon: 'star', keyboardType: 'number-pad', required: true },
];

export const EXAM_CLASS_OPTIONS = [
  { id: 'CAL-101', label: 'CAL-101', full: 'Advanced Calculus' },
  { id: 'PHY-210', label: 'PHY-210', full: 'Theoretical Physics' },
  { id: 'PSY-402', label: 'PSY-402', full: 'Adv. Cognitive Psychology' },
];

export const EXAM_DURATION_OPTIONS = [
  { id: '60 min', label: '60 min' },
  { id: '90 min', label: '90 min' },
  { id: '120 min', label: '120 min' },
  { id: '180 min', label: '180 min' },
];