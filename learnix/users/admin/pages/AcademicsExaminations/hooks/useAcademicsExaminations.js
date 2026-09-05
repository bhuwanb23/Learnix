import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

export const useAcademicsExaminations = (navigation) => {
  const [selectedSemester, setSelectedSemester] = useState('semester-1');
  const [selectedExamType, setSelectedExamType] = useState('mid-term');
  const [isGeneratingTimetable, setIsGeneratingTimetable] = useState(false);
  const [evaluationProgress, setEvaluationProgress] = useState(77);
  const [cheatingAlerts, setCheatingAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timetableGenerated, setTimetableGenerated] = useState(false);

  const handleSemesterChange = useCallback((semester) => {
    setSelectedSemester(semester);
  }, []);

  const handleExamTypeChange = useCallback((examType) => {
    setSelectedExamType(examType);
  }, []);

  const handleGenerateTimetable = useCallback(async () => {
    setIsGeneratingTimetable(true);
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setTimetableGenerated(true);
      if (navigation && navigation.navigate) {
        navigation.navigate('examTimetable');
      }
    } catch (error) {
      // Swallow error — mock flow
    } finally {
      setIsGeneratingTimetable(false);
      setIsLoading(false);
    }
  }, [selectedSemester, selectedExamType, navigation]);

  const handleViewEvaluationDetails = useCallback((subjectId) => {
    if (navigation && navigation.navigate) {
      navigation.navigate('evaluationDetails', { subjectId });
    }
  }, [navigation]);

  const handleCheatingAlertAction = useCallback((alertId, action) => {
    // Update alert status locally
    setCheatingAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId
          ? { ...alert, status: action }
          : alert
      )
    );
    if (action === 'investigate') {
      Alert.alert(
        'Investigate Alert',
        'Opening case file with flagged answer patterns, session logs, and AI evidence...'
      );
    } else {
      Alert.alert('Alert Dismissed', 'This alert has been marked as a false positive.');
    }
  }, []);

  const handleRefreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setEvaluationProgress(prev => Math.min(100, prev + Math.random() * 5));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleExportData = useCallback((dataType) => {
    if (navigation && navigation.navigate) {
      navigation.navigate('exportReport', { dataType });
    }
  }, [navigation]);

  const handleViewDetailedReport = useCallback((reportType) => {
    if (navigation && navigation.navigate) {
      if (reportType === 'cheating') {
        navigation.navigate('cheatingCases');
      } else if (reportType === 'evaluations') {
        navigation.navigate('evaluationDetails');
      } else if (reportType === 'exams') {
        navigation.navigate('examTimetable');
      } else if (reportType === 'performance') {
        navigation.navigate('publishResults');
      }
    }
  }, [navigation]);

  const handleViewAllAlerts = useCallback(() => {
    if (navigation && navigation.navigate) {
      navigation.navigate('cheatingCases');
    }
  }, [navigation]);

  return {
    // State
    selectedSemester,
    selectedExamType,
    isGeneratingTimetable,
    evaluationProgress,
    cheatingAlerts,
    isLoading,
    timetableGenerated,

    // Actions
    handleSemesterChange,
    handleExamTypeChange,
    handleGenerateTimetable,
    handleViewEvaluationDetails,
    handleCheatingAlertAction,
    handleRefreshData,
    handleExportData,
    handleViewDetailedReport,
    handleViewAllAlerts,
  };
};