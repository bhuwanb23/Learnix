import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { api } from '../../../../services/api';

export const useAcademicsExaminations = (navigation) => {
  const [selectedSemester, setSelectedSemester] = useState('semester-1');
  const [selectedExamType, setSelectedExamType] = useState('mid-term');
  const [isGeneratingTimetable, setIsGeneratingTimetable] = useState(false);
  const [evaluationProgress, setEvaluationProgress] = useState(77);
  const [cheatingAlerts, setCheatingAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timetableGenerated, setTimetableGenerated] = useState(false);
  const [academicsData, setAcademicsData] = useState({
    exams: { active: 0, scheduled: 0, completed: 0 },
    evaluations: { total: 0, completed: 0 },
    conflicts: [],
    cheatingCases: [],
  });

  const fetchAcademics = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.adminApi.academics();
      setAcademicsData({
        exams: data.exams || { active: 0, scheduled: 0, completed: 0 },
        evaluations: data.evaluations || { total: 0, completed: 0 },
        conflicts: data.conflicts || [],
        cheatingCases: data.cheatingCases || [],
      });
      if (data.evaluations?.total > 0) {
        setEvaluationProgress(Math.round((data.evaluations.completed / data.evaluations.total) * 100));
      }
      setCheatingAlerts((data.cheatingCases || []).filter(c => c.status === 'UNDER_REVIEW'));
    } catch (error) {
      console.warn('Failed to load academics data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAcademics();
  }, [fetchAcademics]);

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
      await new Promise(resolve => setTimeout(resolve, 1500));
      setTimetableGenerated(true);
      if (navigation && navigation.navigate) {
        navigation.navigate('examTimetable');
      }
    } catch (error) {
      // Swallow error
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
    setCheatingAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, status: action } : alert
      )
    );
    if (action === 'investigate') {
      Alert.alert('Investigate Alert', 'Opening case file with flagged answer patterns, session logs, and AI evidence...');
    } else {
      Alert.alert('Alert Dismissed', 'This alert has been marked as a false positive.');
    }
  }, []);

  const handleRefreshData = useCallback(async () => {
    await fetchAcademics();
  }, [fetchAcademics]);

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
    selectedSemester,
    selectedExamType,
    isGeneratingTimetable,
    evaluationProgress,
    cheatingAlerts,
    isLoading,
    timetableGenerated,
    academicsData,
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
