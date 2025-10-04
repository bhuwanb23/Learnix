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
