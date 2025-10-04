import { useState, useCallback, useEffect } from 'react';
import {
  SYLLABUS_TABS,
  SUBJECTS_DATA,
  AI_REMINDERS,
  OVERALL_STATS,
  getProgressColor,
  getStatusColor,
  getStatusText,
  formatDate,
  calculateDaysRemaining
} from '../constants/syllabusData';

export const useSyllabusProgress = () => {
  const [activeTab, setActiveTab] = useState('byClass');
  const [subjects, setSubjects] = useState(SUBJECTS_DATA);
  const [overallStats, setOverallStats] = useState(OVERALL_STATS);
  const [aiReminders, setAiReminders] = useState(AI_REMINDERS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Tab handling
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  // Subject progress update
  const handleChapterToggle = useCallback((subjectId, chapterId) => {
    setSubjects(prev => prev.map(subject => {
      if (subject.id === subjectId) {
        const updatedChapters = subject.chapters.map(chapter => {
          if (chapter.id === chapterId) {
            return { ...chapter, completed: !chapter.completed };
          }
          return chapter;
        });
        
        const completedChapters = updatedChapters.filter(ch => ch.completed).length;
        const progress = Math.round((completedChapters / subject.totalChapters) * 100);
        const status = getStatusText(progress);
        
        return {
          ...subject,
          chapters: updatedChapters,
          progress,
          status,
          chaptersCompleted: completedChapters
        };
      }
      return subject;
    }));
  }, []);

  // AI reminder actions
  const handleDismissReminder = useCallback((reminderId) => {
    setAiReminders(prev => prev.filter(reminder => reminder.id !== reminderId));
  }, []);

  const handleViewReminder = useCallback((reminderId) => {
    console.log(`View reminder: ${reminderId}`);
    // Navigate to specific subject or chapter
  }, []);

  // Refresh data
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In a real app, fetch fresh data here
      console.log('Refreshing syllabus data...');
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      // In a real app, fetch data from API
      console.log('Loading syllabus data...');
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate overall stats
  const calculateOverallStats = useCallback(() => {
    const totalSubjects = subjects.length;
    const completedSubjects = subjects.filter(s => s.progress === 100).length;
    const inProgressSubjects = subjects.filter(s => s.progress > 0 && s.progress < 100).length;
    const notStartedSubjects = subjects.filter(s => s.progress === 0).length;
    
    const totalProgress = Math.round(
      subjects.reduce((sum, subject) => sum + subject.progress, 0) / totalSubjects
    );

    setOverallStats({
      totalProgress,
      timeRemaining: '4 weeks', // This would be calculated based on due dates
      subjectsCompleted: completedSubjects,
      totalSubjects,
      onTrack: inProgressSubjects,
      behind: subjects.filter(s => s.status === 'Behind Schedule').length,
      notStarted: notStartedSubjects
    });
  }, [subjects]);

  // Update stats when subjects change
  useEffect(() => {
    calculateOverallStats();
  }, [subjects, calculateOverallStats]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter subjects based on active tab
  const getFilteredSubjects = useCallback(() => {
    switch (activeTab) {
      case 'byClass':
        return subjects;
      case 'bySubject':
        return subjects.sort((a, b) => a.name.localeCompare(b.name));
      case 'byGroup':
        return subjects.sort((a, b) => b.progress - a.progress);
      default:
        return subjects;
    }
  }, [subjects, activeTab]);

  return {
    // State
    activeTab,
    subjects: getFilteredSubjects(),
    overallStats,
    aiReminders,
    loading,
    refreshing,
    
    // Data
    tabs: SYLLABUS_TABS,
    
    // Actions
    handleTabChange,
    handleChapterToggle,
    handleDismissReminder,
    handleViewReminder,
    handleRefresh,
    loadData,
    
    // Helper functions
    getProgressColor,
    getStatusColor,
    formatDate,
    calculateDaysRemaining
  };
};
