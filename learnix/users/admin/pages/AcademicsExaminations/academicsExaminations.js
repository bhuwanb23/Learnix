import React from 'react';
import {
  View,
  Text,
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

// Import theme
import { COLORS, TYPOGRAPHY, SPACING } from '../../../../constants/theme';

export default function AcademicsExaminations({ navigation }) {
  const {
    selectedSemester,
    selectedExamType,
    isGeneratingTimetable,
    evaluationProgress,
    isLoading,
    handleSemesterChange,
    handleExamTypeChange,
    handleGenerateTimetable,
    handleViewEvaluationDetails,
    handleCheatingAlertAction,
    handleRefreshData,
    handleExportData,
    handleViewDetailedReport,
  } = useAcademicsExaminations();

  const handleStatPress = (statId) => {
    console.log('Stat pressed:', statId);
    // Navigate to detailed view based on stat type
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

  const handleViewAllAlerts = () => {
    console.log('View all cheating alerts');
    // Navigate to alerts page
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
            colors={['#7c3aed']}
            tintColor="#7c3aed"
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
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.md,
  },
});
