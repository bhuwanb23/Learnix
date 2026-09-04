// Data constants for the exam detail page - teacher view

export const DEFAULT_EXAM_DETAIL = {
  description: 'Comprehensive assessment covering all topics of the unit.',
  maxMarks: 100,
  gradingScale: 'A: 90+, B: 75–89, C: 60–74, D: 50–59, F: below 50',
};

export const EXAM_DETAILS = {
  'midterm-calc': {
    description: 'Covers differential equations, multi-variable integration and applications.',
    maxMarks: 100,
    gradingScale: 'A: 90+, B: 75–89, C: 60–74, D: 50–59, F: below 50',
  },
  'quiz2-phy': {
    description: 'Quiz on electromagnetism topics covered in the last three lectures.',
    maxMarks: 50,
    gradingScale: 'A: 45+, B: 37–44, C: 30–36, D: 25–29, F: below 25',
  },
  'unit1-psy': {
    description: 'Unit test on learning theories, memory models and conditioning.',
    maxMarks: 100,
    gradingScale: 'A: 90+, B: 75–89, C: 60–74, D: 50–59, F: below 50',
  },
  'midterm-phy': {
    description: 'Midterm on mechanics, electromagnetism and thermodynamics.',
    maxMarks: 100,
    gradingScale: 'A: 90+, B: 75–89, C: 60–74, D: 50–59, F: below 50',
  },
};

// Results per exam - studentId -> { marks, status }. Absent students are marked status: 'absent'.
export const RESULTS = {
  'unit1-psy': [
    { studentId: 'JS', marks: 91, status: 'pass' },
    { studentId: 'MK', marks: 54, status: 'pass' },
    { studentId: 'AP', marks: 96, status: 'pass' },
    { studentId: 'RC', marks: 48, status: 'fail' },
    { studentId: 'SK', marks: 85, status: 'pass' },
    { studentId: 'DL', marks: 88, status: 'pass' },
    { studentId: 'MI', marks: 0, status: 'absent' },
    { studentId: 'TK', marks: 93, status: 'pass' },
  ],
  'midterm-phy': [
    { studentId: 'JS', marks: 0, status: 'absent' },
    { studentId: 'MK', marks: null, status: null },
    { studentId: 'AP', marks: 89, status: 'pass' },
    { studentId: 'RC', marks: null, status: null },
    { studentId: 'SK', marks: 76, status: 'pass' },
    { studentId: 'DL', marks: null, status: null },
    { studentId: 'MI', marks: 63, status: 'pass' },
    { studentId: 'TK', marks: 92, status: 'pass' },
  ],
};

export const RESULT_ACTIONS = {
  saveDraft: 'Save Draft',
  publish: 'Publish Results',
  republish: 'Republish Results',
  resultsNotStarted: 'Results open after the exam date',
};