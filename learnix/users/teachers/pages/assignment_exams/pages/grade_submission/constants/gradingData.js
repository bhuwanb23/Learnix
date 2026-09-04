// Data constants for the grade submission page - teacher view

export const GRADING_HEADER = {
  title: 'Grade Submission',
};

export const RUBRIC = [
  { id: 'correctness', label: 'Correctness', weight: '40%', color: '#0050d4' },
  { id: 'process', label: 'Process & Steps', weight: '30%', color: '#702ae1' },
  { id: 'clarity', label: 'Clarity', weight: '20%', color: '#16a34a' },
  { id: 'format', label: 'Formatting', weight: '10%', color: '#d97706' },
];

export const GRADE_PRESETS = [0, 50, 75, 90, 100];

export const GRADE_LABELS = {
  gradeInput: 'Score (out of 100)',
  feedbackPlaceholder: 'Write feedback for this student…',
  plagiarism: 'Plagiarism check',
};