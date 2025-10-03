// Assignment data constants
export const ASSIGNMENT_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress', 
  READY_TO_SUBMIT: 'ready_to_submit',
  SUBMITTED: 'submitted',
  GRADED: 'graded'
};

export const ASSIGNMENT_PRIORITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

export const ASSIGNMENT_TABS = [
  { id: 'pending', title: 'Pending', count: 4 },
  { id: 'submitted', title: 'Submitted', count: 2 },
  { id: 'graded', title: 'Graded', count: 8 }
];

export const MOCK_ASSIGNMENTS = {
  pending: [
    {
      id: '1',
      title: 'Data Structures Final Project',
      course: 'Computer Science',
      courseCode: 'CS301',
      dueDate: '2024-10-15',
      timeLeft: '2 days left',
      status: ASSIGNMENT_STATUS.NOT_STARTED,
      priority: ASSIGNMENT_PRIORITY.HIGH,
      progress: 0,
      description: 'Create a comprehensive data structure implementation showcasing various algorithms and their time complexities.',
      requirements: [
        'Implement at least 3 different data structures',
        'Include time complexity analysis',
        'Provide test cases and documentation'
      ],
      allowedFileTypes: ['PDF', 'DOC', 'ZIP'],
      maxFileSize: '10MB'
    },
    {
      id: '2',
      title: 'Marketing Research Report',
      course: 'Business',
      courseCode: 'MKT205',
      dueDate: '2024-10-20',
      timeLeft: '7 days left',
      status: ASSIGNMENT_STATUS.IN_PROGRESS,
      priority: ASSIGNMENT_PRIORITY.MEDIUM,
      progress: 60,
      description: 'Conduct comprehensive market research and prepare detailed analysis report.',
      requirements: [
        'Market analysis with data visualization',
        'SWOT analysis for target companies',
        'Strategic recommendations'
      ],
      allowedFileTypes: ['PDF', 'DOC'],
      maxFileSize: '5MB'
    },
    {
      id: '3',
      title: 'Literature Review Essay',
      course: 'English',
      courseCode: 'ENG102',
      dueDate: '2024-10-25',
      timeLeft: '12 days left',
      status: ASSIGNMENT_STATUS.READY_TO_SUBMIT,
      priority: ASSIGNMENT_PRIORITY.LOW,
      progress: 100,
      description: 'Write a comprehensive literature review on modern poetry trends.',
      requirements: [
        'Minimum 1500 words',
        'At least 10 academic sources',
        'Proper MLA citation format'
      ],
      allowedFileTypes: ['PDF', 'DOC'],
      maxFileSize: '5MB'
    },
    {
      id: '4',
      title: 'Database Design Project',
      course: 'Information Technology',
      courseCode: 'IT205',
      dueDate: '2024-10-18',
      timeLeft: '5 days left',
      status: ASSIGNMENT_STATUS.NOT_STARTED,
      priority: ASSIGNMENT_PRIORITY.HIGH,
      progress: 0,
      description: 'Design a normalized database system for e-commerce platform.',
      requirements: [
        'Entity Relationship Diagrams',
        'Normalization to 3NF',
        'Implementation scripts'
      ],
      allowedFileTypes: ['PDF', 'SQL', 'DOC'],
      maxFileSize: '8MB'
    }
  ],
  submitted: [
    {
      id: '5',
      title: 'Physics Lab Report',
      course: 'Physics',
      courseCode: 'PHY201',
      submittedDate: '2024-10-08',
      status: ASSIGNMENT_STATUS.SUBMITTED,
      fileName: 'lab-report.pdf',
      description: 'Analyze pendulum motion and calculate gravitational acceleration.'
    },
    {
      id: '6',
      title: 'Chemistry Experiment',
      course: 'Chemistry',
      courseCode: 'CHEM101',
      submittedDate: '2024-10-06',
      status: ASSIGNMENT_STATUS.SUBMITTED,
      fileName: 'chem-lab-report.pdf',
      description: 'Chemical reaction rates and temperature effects.'
    }
  ],
  graded: [
    {
      id: '7',
      title: 'Mathematics Quiz 3',
      course: 'Mathematics',
      courseCode: 'MATH101',
      gradedDate: '2024-10-05',
      status: ASSIGNMENT_STATUS.GRADED,
      score: 92,
      grade: 'A-',
      feedback: 'Excellent work! You demonstrated strong understanding of calculus concepts.'
    },
    {
      id: '8',
      title: 'History Essay',
      course: 'History',
      courseCode: 'HIST101',
      gradedDate: '2024-10-03',
      status: ASSIGNMENT_STATUS.GRADED,
      score: 88,
      grade: 'B+',
      feedback: 'Well-researched essay with good analysis. Consider stronger thesis statement.'
    },
    {
      id: '9',
      title: 'Programming Assignment',
      course: 'Computer Science',
      courseCode: 'CS201',
      gradedDate: '2024-09-30',
      status: ASSIGNMENT_STATUS.GRADED,
      score: 95,
      grade: 'A',
      feedback: 'Outstanding implementation! Code is clean and well-documented.'
    }
  ]
};

export const getStatusConfig = (status) => {
  switch (status) {
    case ASSIGNMENT_STATUS.NOT_STARTED:
      return {
        label: 'Not Started',
        color: '#EF4444',
        bgColor: '#FEE2E2',
        textColor: '#DC2626',
        badgeColor: '#EF4444'
      };
    case ASSIGNMENT_STATUS.IN_PROGRESS:
      return {
        label: 'In Progress',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        textColor: '#D97706',
        badgeColor: '#F59E0B'
      };
    case ASSIGNMENT_STATUS.READY_TO_SUBMIT:
      return {
        label: 'Ready to Submit',
        color: '#10B981',
        bgColor: '#D1FAE5',
        textColor: '#059669',
        badgeColor: '#10B981'
      };
    case ASSIGNMENT_STATUS.SUBMITTED:
      return {
        label: 'Awaiting Grade',
        color: '#3B82F6',
        bgColor: '#DBEAFE',
        textColor: '#2563EB',
        badgeColor: '#3B82F6'
      };
    case ASSIGNMENT_STATUS.GRADED:
      return {
        label: 'Completed',
        color: '#10B981',
        bgColor: '#D1FAE5',
        textColor: '#059669',
        badgeColor: '#10B981'
      };
    default:
      return {
        label: 'Unknown',
        color: '#6B7280',
        bgColor: '#F3F4F6',
        textColor: '#374151',
        badgeColor: '#6B7280'
      };
  }
};

export const getPriorityConfig = (priority) => {
  switch (priority) {
    case ASSIGNMENT_PRIORITY.HIGH:
      return {
        label: 'Due Soon',
        badgeColor: '#EF4444',
        textColor: '#DC2626'
      };
    case ASSIGNMENT_PRIORITY.MEDIUM:
      return {
        label: 'In Progress',
        badgeColor: '#F59E0B',
        textColor: '#D97706'
      };
    case ASSIGNMENT_PRIORITY.LOW:
      return {
        label: 'Ready',
        badgeColor: '#10B981',
        textColor: '#059669'
      };
    default:
      return {
        label: 'Unknown',
        badgeColor: '#6B7280',
        textColor: '#374151'
      };
  }
};
