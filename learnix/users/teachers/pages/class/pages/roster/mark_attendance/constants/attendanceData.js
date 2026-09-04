// Data constants for the mark attendance page - teacher view

export const ATTENDANCE_HEADER = {
  title: 'Mark Attendance',
  subtitle: 'Tap a status for each student, then save.',
};

export const STATUS_OPTIONS = [
  { id: 'present', label: 'P', fullLabel: 'Present', color: '#16a34a', bg: '#dcfce7' },
  { id: 'absent', label: 'A', fullLabel: 'Absent', color: '#b31b25', bg: '#fde3e5' },
  { id: 'late', label: 'L', fullLabel: 'Late', color: '#d97706', bg: '#fef3c7' },
  { id: 'excused', label: 'E', fullLabel: 'Excused', color: '#0050d4', bg: '#dbeafe' },
];

export const LECTURE_SLOT = {
  label: 'Lecture 24 · 09:00 – 10:00 AM',
  unit: 'Unit 03 — Learning & Memory',
};

export const MARK_ALL = {
  label: 'Mark all present',
  icon: 'check-circle',
};