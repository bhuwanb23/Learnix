// Assignment data constants
export const ASSIGNMENT_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  GRADED: 'graded',
  OVERDUE: 'overdue',
};

export const ASSIGNMENT_PRIORITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

export const FILE_TYPES = {
  PDF: 'pdf',
  DOC: 'doc',
  DOCX: 'docx',
  TXT: 'txt',
  IMAGE: 'image',
};

export const mockAssignments = [
  {
    id: '1',
    title: 'Math Assignment #5',
    description: 'Calculus Problems',
    subject: 'Mathematics',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    status: ASSIGNMENT_STATUS.IN_PROGRESS,
    priority: ASSIGNMENT_PRIORITY.HIGH,
    progress: 60,
    totalMarks: 100,
    submittedMarks: null,
    files: [
      {
        id: '1',
        name: 'assignment_draft.pdf',
        type: FILE_TYPES.PDF,
        size: '2.4 MB',
        uploadedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    ],
    instructions: 'Complete all calculus problems and show your work clearly.',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    title: 'Physics Lab Report',
    description: 'Motion Analysis',
    subject: 'Physics',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
    status: ASSIGNMENT_STATUS.PENDING,
    priority: ASSIGNMENT_PRIORITY.MEDIUM,
    progress: 30,
    totalMarks: 50,
    submittedMarks: null,
    files: [],
    instructions: 'Analyze the motion data and write a comprehensive lab report.',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    title: 'Chemistry Research Paper',
    description: 'Organic Chemistry',
    subject: 'Chemistry',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
    status: ASSIGNMENT_STATUS.PENDING,
    priority: ASSIGNMENT_PRIORITY.LOW,
    progress: 0,
    totalMarks: 150,
    submittedMarks: null,
    files: [],
    instructions: 'Write a 2000-word research paper on organic chemistry reactions.',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    title: 'English Essay',
    description: 'Literary Analysis',
    subject: 'English',
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Overdue
    status: ASSIGNMENT_STATUS.OVERDUE,
    priority: ASSIGNMENT_PRIORITY.HIGH,
    progress: 80,
    totalMarks: 75,
    submittedMarks: null,
    files: [],
    instructions: 'Analyze the themes in the assigned novel.',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
];

export const mockQuickActions = [
  {
    id: '1',
    title: 'Submit Work',
    description: '2 pending',
    icon: 'cloud-upload-outline',
    color: '#F97316', // Orange
    action: 'submit',
  },
  {
    id: '2',
    title: 'Take Quiz',
    description: '3 available',
    icon: 'bulb-outline',
    color: '#22C55E', // Green
    action: 'quiz',
  },
];

export const mockUpcomingExams = [
  {
    id: '1',
    title: 'Chemistry Midterm',
    description: 'Organic Chemistry',
    subject: 'Chemistry',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    duration: 120, // minutes
    totalMarks: 100,
    preparationStatus: 'in_progress',
  },
];

export const getStatusColor = (status) => {
  switch (status) {
    case ASSIGNMENT_STATUS.OVERDUE:
      return '#EF4444'; // Red
    case ASSIGNMENT_STATUS.IN_PROGRESS:
      return '#F59E0B'; // Yellow
    case ASSIGNMENT_STATUS.PENDING:
      return '#3B82F6'; // Blue
    case ASSIGNMENT_STATUS.SUBMITTED:
      return '#10B981'; // Green
    case ASSIGNMENT_STATUS.GRADED:
      return '#8B5CF6'; // Purple
    default:
      return '#6B7280'; // Gray
  }
};

export const getStatusText = (status) => {
  switch (status) {
    case ASSIGNMENT_STATUS.OVERDUE:
      return 'Overdue';
    case ASSIGNMENT_STATUS.IN_PROGRESS:
      return 'In Progress';
    case ASSIGNMENT_STATUS.PENDING:
      return 'Pending';
    case ASSIGNMENT_STATUS.SUBMITTED:
      return 'Submitted';
    case ASSIGNMENT_STATUS.GRADED:
      return 'Graded';
    default:
      return 'Unknown';
  }
};

export const getPriorityColor = (priority) => {
  switch (priority) {
    case ASSIGNMENT_PRIORITY.HIGH:
      return '#EF4444'; // Red
    case ASSIGNMENT_PRIORITY.MEDIUM:
      return '#F59E0B'; // Yellow
    case ASSIGNMENT_PRIORITY.LOW:
      return '#10B981'; // Green
    default:
      return '#6B7280'; // Gray
  }
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileIcon = (type) => {
  switch (type) {
    case FILE_TYPES.PDF:
      return 'document-text-outline';
    case FILE_TYPES.DOC:
    case FILE_TYPES.DOCX:
      return 'document-outline';
    case FILE_TYPES.TXT:
      return 'document-outline';
    case FILE_TYPES.IMAGE:
      return 'image-outline';
    default:
      return 'document-outline';
  }
};

export const getFileColor = (type) => {
  switch (type) {
    case FILE_TYPES.PDF:
      return '#EF4444'; // Red
    case FILE_TYPES.DOC:
    case FILE_TYPES.DOCX:
      return '#3B82F6'; // Blue
    case FILE_TYPES.TXT:
      return '#6B7280'; // Gray
    case FILE_TYPES.IMAGE:
      return '#10B981'; // Green
    default:
      return '#6B7280'; // Gray
  }
};
