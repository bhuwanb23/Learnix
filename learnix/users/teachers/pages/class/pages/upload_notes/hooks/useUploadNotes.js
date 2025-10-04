import { useState, useCallback } from 'react';
import {
  UPLOAD_TABS,
  AI_SUGGESTED_TAGS,
  RECENT_UPLOADS,
  MY_NOTES,
  SHARED_NOTES,
  UPLOAD_STATES,
  SUBJECTS,
  FILE_TYPES,
  generateUploadId,
  getFileTypeFromName,
  formatFileSize
} from '../constants/uploadData';

export const useUploadNotes = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadState, setUploadState] = useState(UPLOAD_STATES.IDLE);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadForm, setUploadForm] = useState({
    subject: 'Mathematics',
    date: new Date().toISOString().split('T')[0],
    type: 'PDF',
    customTags: ''
  });
  const [selectedTags, setSelectedTags] = useState(
    AI_SUGGESTED_TAGS.filter(tag => tag.selected).map(tag => tag.id)
  );
  const [recentUploads, setRecentUploads] = useState(RECENT_UPLOADS);
  const [myNotes, setMyNotes] = useState(MY_NOTES);
  const [sharedNotes, setSharedNotes] = useState(SHARED_NOTES);

  // Tab handling
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  // File selection
  const handleFileSelect = useCallback((files) => {
    const newFiles = files.map(file => ({
      id: generateUploadId(),
      name: file.name,
      size: file.size,
      type: getFileTypeFromName(file.name),
      file: file,
      progress: 0
    }));
    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, []);

  // File removal
  const handleRemoveFile = useCallback((fileId) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  // Form handling
  const handleFormChange = useCallback((field, value) => {
    setUploadForm(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Tag handling
  const handleTagToggle = useCallback((tagId) => {
    setSelectedTags(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId);
      } else {
        return [...prev, tagId];
      }
    });
  }, []);

  const handleAddCustomTag = useCallback((tag) => {
    if (tag.trim() && !selectedTags.includes(tag.trim().toLowerCase())) {
      setSelectedTags(prev => [...prev, tag.trim().toLowerCase()]);
      setUploadForm(prev => ({
        ...prev,
        customTags: ''
      }));
    }
  }, [selectedTags]);

  // Upload simulation
  const simulateUpload = useCallback(() => {
    if (selectedFiles.length === 0) return;

    setUploadState(UPLOAD_STATES.UPLOADING);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = prev + Math.random() * 15;
        if (newProgress >= 100) {
          clearInterval(interval);
          setUploadState(UPLOAD_STATES.SUCCESS);
          
          // Add to recent uploads
          const newUploads = selectedFiles.map(file => ({
            id: generateUploadId(),
            name: file.name,
            type: file.type,
            size: formatFileSize(file.size),
            timeAgo: 'Just now',
            icon: file.type === 'pdf' ? '📄' : file.type === 'ppt' ? '📊' : '▶️',
            color: file.type === 'pdf' ? '#EF4444' : file.type === 'ppt' ? '#F97316' : '#3B82F6'
          }));
          
          setRecentUploads(prev => [...newUploads, ...prev]);
          setSelectedFiles([]);
          
          setTimeout(() => {
            setUploadState(UPLOAD_STATES.IDLE);
            setUploadProgress(0);
          }, 2000);
          
          return 100;
        }
        return newProgress;
      });
    }, 200);
  }, [selectedFiles]);

  // Upload handling
  const handleUpload = useCallback(() => {
    simulateUpload();
  }, [simulateUpload]);

  // Recent upload actions
  const handleRecentUploadAction = useCallback((uploadId, action) => {
    console.log(`Action ${action} on upload ${uploadId}`);
    // Implement share, delete, etc.
  }, []);

  // My notes actions
  const handleMyNoteAction = useCallback((noteId, action) => {
    console.log(`Action ${action} on my note ${noteId}`);
    // Implement edit, delete, share, etc.
  }, []);

  // Shared notes actions
  const handleSharedNoteAction = useCallback((noteId, action) => {
    console.log(`Action ${action} on shared note ${noteId}`);
    // Implement download, bookmark, etc.
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    setUploadForm({
      subject: 'Mathematics',
      date: new Date().toISOString().split('T')[0],
      type: 'PDF',
      customTags: ''
    });
    setSelectedTags(AI_SUGGESTED_TAGS.filter(tag => tag.selected).map(tag => tag.id));
    setSelectedFiles([]);
  }, []);

  return {
    // State
    activeTab,
    uploadState,
    uploadProgress,
    selectedFiles,
    uploadForm,
    selectedTags,
    recentUploads,
    myNotes,
    sharedNotes,
    
    // Data
    tabs: UPLOAD_TABS,
    subjects: SUBJECTS,
    fileTypes: FILE_TYPES,
    aiSuggestedTags: AI_SUGGESTED_TAGS,
    
    // Actions
    handleTabChange,
    handleFileSelect,
    handleRemoveFile,
    handleFormChange,
    handleTagToggle,
    handleAddCustomTag,
    handleUpload,
    handleRecentUploadAction,
    handleMyNoteAction,
    handleSharedNoteAction,
    resetForm
  };
};
