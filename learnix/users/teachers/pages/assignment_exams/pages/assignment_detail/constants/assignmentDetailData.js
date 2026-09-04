// Data constants for the assignment detail page - teacher view

export const DEFAULT_DETAIL = {
  description: 'Solve the problem set covering this week\u2019s topics. Show all intermediate steps and cite any external resources used.',
  points: 100,
  assignedDate: 'Oct 5',
  resources: ['problem_set_04.pdf', 'formula_sheet.pdf'],
  instructions: [
    'Attempt every problem; partial credit is given.',
    'Show all intermediate steps clearly.',
    'Submit a single PDF under 10 MB.',
  ],
};

export const ASSIGNMENT_DETAILS = {
  ps04: {
    description: 'Solve Problem Set #04 covering differential equations and multi-variable integration. Show all intermediate steps.',
    points: 100,
    assignedDate: 'Oct 5',
    resources: ['problem_set_04.pdf', 'formula_sheet.pdf'],
    instructions: [
      'Attempt every problem; partial credit is given.',
      'Show all intermediate steps clearly.',
      'Submit a single PDF under 10 MB.',
    ],
  },
  lab01: {
    description: 'Write a lab report for the optics experiment. Include methodology, raw measurements, uncertainty analysis and conclusions.',
    points: 50,
    assignedDate: 'Oct 6',
    resources: ['lab_template.docx', 'optics_manual.pdf'],
    instructions: [
      'Include a labeled diagram of the setup.',
      'Report uncertainties for every measurement.',
      'Answer the discussion questions at the end.',
    ],
  },
  resp02: {
    description: 'Write a two-page reading response connecting this week\u2019s readings to the lecture on memory models.',
    points: 25,
    assignedDate: 'Oct 10',
    resources: ['readings_memory.pdf'],
    instructions: [
      'Refer to at least two of the assigned readings.',
      'Use APA citations.',
      'Submit before the deadline to avoid late penalty.',
    ],
  },
  refl01: {
    description: 'Submit a short weekly reflection on your progress with the course material this week.',
    points: 10,
    assignedDate: 'Oct 18',
    resources: [],
    instructions: [
      'One page maximum.',
      'Focus on what you learned and what remains unclear.',
    ],
  },
  ps03: {
    description: 'Problem set on sequences, series and convergence tests.',
    points: 100,
    assignedDate: 'Sep 20',
    resources: ['problem_set_03.pdf'],
    instructions: [
      'Attempt every problem.',
      'Show all intermediate steps.',
    ],
  },
};