import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';

// Import components
import QuickStats from './components/QuickStats';
import TimetableGenerator from './components/TimetableGenerator';
import EvaluationDashboard from './components/EvaluationDashboard';
import AICheatingDetection from './components/AICheatingDetection';

// Import hooks and constants
import { useAcademicsExaminations } from './hooks/useAcademicsExaminations';
import {
  QUICK_STATS,
  CONFLICT_STATUS,
  SMART_SUGGESTIONS,
  EVALUATION_STATS,
  SUBJECT_PROGRESS,
  CHEATING_DETECTION_STATS,
  CHEATING_ALERTS,
} from './constants/academicsData';

// Sub-pages
import ExamTimetable from './pages/exam_timetable/exam_timetable';
import EvaluationDetails from './pages/evaluation_details/evaluation_details';
import CheatingCases from './pages/cheating_cases/cheating_cases';
import PublishResults from './pages/publish_results/publish_results';
import ExportReport from './pages/export_report/export_report';

// Import theme
import { COLORS, SPACING } from '../../../../constants/theme';

export default function AcademicsExaminations({ navigation }) {
  const [subScreen, setSubScreen] = useState('main');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [exportType, setExportType] = useState(null);

  const handleNavigate = (screen, params) => {
    if (params && params.subjectId) setSelectedSubject(params.subjectId);
    if (params && params.dataType) setExportType(params.dataType);
    setSubScreen(screen);
  };

  const handleBack = () => {
    setSubScreen('main');
    setSelectedSubject(null);
    setExportType(null);
  };

  const moduleNavigation = {
    ...navigation,
    navigate: handleNavigate,
    back: handleBack,
  };

  const {
    selectedSemester,
    selectedExamType,
    isGeneratingTimetable,
    isLoading,
    timetableGenerated,
    handleSemesterChange,
    handleExamTypeChange,
    handleGenerateTimetable,
    handleViewEvaluationDetails,
    handleCheatingAlertAction,
    handleRefreshData,
    handleExportData,
    handleViewDetailedReport,
    handleViewAllAlerts,
  } = useAcademicsExaminations(moduleNavigation);

  // Sub-screen routing
  if (subScreen === 'examTimetable') {
    return <ExamTimetable onBack={handleBack} />;
  }
  if (subScreen === 'evaluationDetails') {
    return <EvaluationDetails subjectId={selectedSubject} onBack={handleBack} />;
  }
  if (subScreen === 'cheatingCases') {
    return <CheatingCases alerts={CHEATING_ALERTS} onBack={handleBack} />;
  }
  if (subScreen === 'publishResults') {
    return <PublishResults onBack={handleBack} />;
  }
  if (subScreen === 'exportReport') {
    return <ExportReport dataType={exportType} onBack={handleBack} />;
  }

  const handleStatPress = (statId) => {
    switch (statId) {
      case 'active-exams':
        handleViewDetailedReport('exams');
        break;
      case 'pass-rate':
        handleViewDetailedReport('performance');
        break;
      case 'cheating-cases':
        handleViewDetailedReport('cheating');
        break;
      case 'evaluations':
        handleViewDetailedReport('evaluations');
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefreshData}
            colors={['#2563eb']}
            tintColor="#2563eb"
          />
        }
      >
        {/* Quick Stats */}
        <View style={styles.section}>
          <QuickStats
            stats={QUICK_STATS}
            onStatPress={handleStatPress}
          />
        </View>

        {/* Timetable Generator */}
        <View style={styles.section}>
          <TimetableGenerator
            selectedSemester={selectedSemester}
            selectedExamType={selectedExamType}
            conflictStatus={CONFLICT_STATUS}
            smartSuggestions={SMART_SUGGESTIONS}
            onSemesterChange={handleSemesterChange}
            onExamTypeChange={handleExamTypeChange}
            onGenerateTimetable={handleGenerateTimetable}
            isGenerating={isGeneratingTimetable}
            timetableGenerated={timetableGenerated}
            onViewTimetable={() => handleNavigate('examTimetable')}
          />
        </View>

        {/* Evaluation Dashboard */}
        <View style={styles.section}>
          <EvaluationDashboard
            evaluationStats={EVALUATION_STATS}
            subjectProgress={SUBJECT_PROGRESS}
            onViewDetails={handleViewEvaluationDetails}
            onExportData={handleExportData}
          />
        </View>

        {/* AI Cheating Detection */}
        <View style={styles.section}>
          <AICheatingDetection
            detectionStats={CHEATING_DETECTION_STATS}
            alerts={CHEATING_ALERTS}
            onAlertAction={handleCheatingAlertAction}
            onViewAllAlerts={handleViewAllAlerts}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
});