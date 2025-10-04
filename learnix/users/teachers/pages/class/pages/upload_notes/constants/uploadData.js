// Upload Notes Constants
export const UPLOAD_TABS = [
  { id: 'upload', label: 'Upload New', active: true },
  { id: 'myNotes', label: 'My Notes', active: false },
  { id: 'shared', label: 'Shared', active: false }
];

export const SUBJECTS = [
  'Mathematics',
  'Physics', 
  'Chemistry',
  'Biology',
  'English',
  'History',
  'Geography',
  'Computer Science'
];

export const FILE_TYPES = [
  'PDF',
  'PPT',
  'Video',
  'Document',
  'Image',
  'Audio'
];

export const AI_SUGGESTED_TAGS = [
  { id: 'algebra', label: 'Algebra', selected: true },
  { id: 'equations', label: 'Equations', selected: true },
  { id: 'chapter5', label: 'Chapter 5', selected: true },
  { id: 'functions', label: 'Functions', selected: false },
  { id: 'graphs', label: 'Graphs', selected: false },
  { id: 'calculus', label: 'Calculus', selected: false },
  { id: 'geometry', label: 'Geometry', selected: false },
  { id: 'statistics', label: 'Statistics', selected: false }
];

export const RECENT_UPLOADS = [
  {
    id: '1',
    name: 'Physics_Mechanics.pdf',
    type: 'pdf',
    size: '3.2 MB',
    timeAgo: '2 hours ago',
    icon: '📄',
    color: '#EF4444'
  },
  {
    id: '2', 
    name: 'Chemistry_Lab.pptx',
    type: 'ppt',
    size: '5.8 MB',
    timeAgo: '1 day ago',
    icon: '📊',
    color: '#F97316'
  },
  {
    id: '3',
    name: 'Biology_DNA_Structure.mp4',
    type: 'video',
    size: '45.2 MB',
    timeAgo: '3 days ago',
    icon: '▶️',
    color: '#3B82F6'
  }
];

export const MY_NOTES = [
  {
    id: '1',
    title: 'Advanced Calculus - Chapter 5',
    subject: 'Mathematics',
    date: 'Oct 25, 2024',
    size: '2.4 MB',
    views: 24,
    icon: '📄',
    color: '#EF4444',
    tags: ['Calculus', 'Derivatives', 'Chapter 5']
  },
  {
    id: '2',
    title: 'Organic Chemistry Reactions',
    subject: 'Chemistry',
    date: 'Oct 24, 2024',
    size: '3.8 MB',
    views: 18,
    icon: '📊',
    color: '#F97316',
    tags: ['Organic', 'Reactions', 'Mechanisms']
  },
  {
    id: '3',
    title: 'Quantum Physics Fundamentals',
    subject: 'Physics',
    date: 'Oct 23, 2024',
    size: '5.2 MB',
    views: 31,
    icon: '▶️',
    color: '#3B82F6',
    tags: ['Quantum', 'Physics', 'Fundamentals']
  },
  {
    id: '4',
    title: 'Cell Biology Structure',
    subject: 'Biology',
    date: 'Oct 22, 2024',
    size: '4.1 MB',
    views: 15,
    icon: '📄',
    color: '#10B981',
    tags: ['Cell', 'Biology', 'Structure']
  }
];

export const SHARED_NOTES = [
  {
    id: '1',
    title: 'Machine Learning Algorithms',
    subject: 'Computer Science',
    author: 'Dr. Sarah Johnson',
    sharedTime: '2 hours ago',
    size: '6.2 MB',
    downloads: 45,
    icon: '📄',
    color: '#8B5CF6',
    tags: ['ML', 'Algorithms', 'AI'],
    featured: true
  },
  {
    id: '2',
    title: 'Data Structures Implementation',
    subject: 'Computer Science',
    author: 'Prof. Michael Chen',
    sharedTime: '5 hours ago',
    size: '3.5 MB',
    downloads: 32,
    icon: '📊',
    color: '#F59E0B',
    tags: ['Data Structures', 'Implementation'],
    featured: true
  },
  {
    id: '3',
    title: 'Database Design Principles',
    subject: 'Computer Science',
    author: 'Dr. Emily Rodriguez',
    sharedTime: '1 day ago',
    size: '4.8 MB',
    downloads: 28,
    icon: '📄',
    color: '#EF4444',
    tags: ['Database', 'Design', 'SQL'],
    featured: false
  },
  {
    id: '4',
    title: 'Software Engineering Patterns',
    subject: 'Computer Science',
    author: 'Prof. David Kim',
    sharedTime: '2 days ago',
    size: '5.1 MB',
    downloads: 19,
    icon: '📊',
    color: '#3B82F6',
    tags: ['Software Engineering', 'Patterns'],
    featured: false
  }
];

export const UPLOAD_STATES = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  SUCCESS: 'success',
  ERROR: 'error'
};

export const FILE_TYPE_ICONS = {
  pdf: '📄',
  ppt: '📊',
  video: '▶️',
  document: '📝',
  image: '🖼️',
  audio: '🎵'
};

export const FILE_TYPE_COLORS = {
  pdf: '#EF4444',
  ppt: '#F97316', 
  video: '#3B82F6',
  document: '#10B981',
  image: '#8B5CF6',
  audio: '#F59E0B'
};

// Helper functions
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileTypeFromName = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase();
  const typeMap = {
    'pdf': 'pdf',
    'ppt': 'ppt',
    'pptx': 'ppt',
    'mp4': 'video',
    'avi': 'video',
    'mov': 'video',
    'doc': 'document',
    'docx': 'document',
    'jpg': 'image',
    'jpeg': 'image',
    'png': 'image',
    'mp3': 'audio',
    'wav': 'audio'
  };
  return typeMap[extension] || 'document';
};

export const generateUploadId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
