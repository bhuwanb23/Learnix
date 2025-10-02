import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Import components
import ProgressOverview from './components/ProgressOverview';
import TabNavigation from './components/TabNavigation';
import QuickActions from './components/QuickActions';
import AssignmentCard from './components/AssignmentCard';
import UploadCard from './components/UploadCard';
import ExamCard from './components/ExamCard';
import QuizInterface from './components/QuizInterface';
import ExamPreparation from './components/ExamPreparation';
import PerformanceAnalytics from './components/PerformanceAnalytics';

// Import hooks
import { useAssignments } from './hooks/useAssignments';
import { useFileUpload } from './hooks/useFileUpload';
import { useAssignmentActions } from './hooks/useAssignmentActions';

// Import constants
import { mockQuickActions, mockUpcomingExams } from './constants/assignmentData';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING } from '../../../../constants/theme';

export default function AssignmentPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  // Custom hooks
  const {
    assignments,
    loading: assignmentsLoading,
    error: assignmentsError,
    updateAssignment,
  } = useAssignments();

  const {
    uploadedFiles,
    uploading: fileUploading,
    error: fileError,
    pickDocument,
    removeFile,
    uploadFiles,
  } = useFileUpload();

  const {
    loading: actionLoading,
    handleQuickAction,
    handleAssignmentPress,
    handleAssignmentAction,
    handleSubmitAssignment,
    handlePastPapers,
    handleAIPrep,
  } = useAssignmentActions();

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleChooseFiles = async () => {
    await pickDocument();
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      return;
    }
    
    const success = await handleSubmitAssignment('current-assignment', uploadedFiles);
    if (success) {
      // Clear uploaded files
      uploadedFiles.forEach(file => removeFile(file.id));
    }
  };

  const handleRemoveFile = (fileId) => {
    removeFile(fileId);
  };

  const handleTabPress = (tabId) => {
    setActiveTab(tabId);
  };

  const handleQuizAnswer = (answerIndex) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNextQuestion = () => {
    // Handle next question logic
    setSelectedAnswer(null);
  };

  const handleAIHint = () => {
    // Handle AI hint logic
    console.log('AI Hint requested');
  };

  const handleExamPrepItem = (item) => {
    console.log('Exam prep item pressed:', item.title);
  };

  const renderDashboardTab = () => (
    <ScrollView
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Progress Overview Header */}
      <LinearGradient
        colors={['#3B82F6', '#8B5CF6']}
        style={styles.headerGradient}
      >
        <ProgressOverview progress={78} title="Weekly Progress" />
      </LinearGradient>

      {/* Quick Actions */}
      {mockQuickActions && mockQuickActions.length > 0 && (
        <QuickActions
          actions={mockQuickActions}
          onActionPress={handleQuickAction}
        />
      )}

      {/* Pending Tasks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Tasks</Text>
        {assignmentsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : assignmentsError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{assignmentsError}</Text>
          </View>
        ) : (
          assignments && assignments
            .filter(assignment => assignment.status !== 'submitted')
            .slice(0, 2) // Show only first 2 for dashboard
            .map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onPress={handleAssignmentPress}
                onActionPress={handleAssignmentAction}
              />
            ))
        )}
      </View>

      {/* Upcoming Exams */}
      {mockUpcomingExams && mockUpcomingExams.length > 0 && (
        <ExamCard
          exam={mockUpcomingExams[0]}
          onPastPapers={handlePastPapers}
          onAIPrep={handleAIPrep}
        />
      )}

      {/* Performance Analytics */}
      <PerformanceAnalytics />
    </ScrollView>
  );

  const renderAssignmentsTab = () => (
    <ScrollView
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Quick Actions */}
      {mockQuickActions && mockQuickActions.length > 0 && (
        <QuickActions
          actions={mockQuickActions}
          onActionPress={handleQuickAction}
        />
      )}

      {/* Upload Section */}
      <UploadCard
        onChooseFiles={handleChooseFiles}
        uploadedFiles={uploadedFiles}
        onRemoveFile={handleRemoveFile}
      />

      {/* Pending Assignments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Tasks</Text>
        {assignmentsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : assignmentsError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{assignmentsError}</Text>
          </View>
            ) : (
              assignments && assignments
                .filter(assignment => assignment.status !== 'submitted')
                .map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    onPress={handleAssignmentPress}
                    onActionPress={handleAssignmentAction}
                  />
                ))
            )}
      </View>

      {/* Upcoming Exams */}
      {mockUpcomingExams && mockUpcomingExams.length > 0 && (
        <ExamCard
          exam={mockUpcomingExams[0]}
          onPastPapers={handlePastPapers}
          onAIPrep={handleAIPrep}
        />
      )}
    </ScrollView>
  );

  const renderSubmittedTab = () => (
    <ScrollView
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Submitted Assignments</Text>
        {assignmentsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
            ) : (
              assignments && assignments
                .filter(assignment => assignment.status === 'submitted')
                .map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    onPress={handleAssignmentPress}
                    onActionPress={handleAssignmentAction}
                  />
                ))
            )}
      </View>
    </ScrollView>
  );

  const renderExamsTab = () => (
    <ScrollView
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Quiz Interface */}
      <QuizInterface
        onAnswerSelect={handleQuizAnswer}
        onNextQuestion={handleNextQuestion}
        onAIHint={handleAIHint}
      />

      {/* Exam Preparation */}
      <ExamPreparation onItemPress={handleExamPrepItem} />
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardTab();
      case 'assignments':
        return renderAssignmentsTab();
      case 'exams':
        return renderExamsTab();
      default:
        return renderDashboardTab();
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <TabNavigation
        tabs={[
          { id: 'dashboard', title: 'Dashboard' },
          { id: 'assignments', title: 'Assignments' },
          { id: 'exams', title: 'Exams' },
        ]}
        activeTab={activeTab}
        onTabPress={handleTabPress}
      />

      {/* Tab Content */}
      <View style={styles.tabContentContainer}>
        {renderTabContent()}
      </View>

      {/* Loading Overlay */}
      {(actionLoading || fileUploading) && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>
              {fileUploading ? 'Uploading files...' : 'Processing...'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerGradient: {
    marginHorizontal: -SPACING.lg,
    marginTop: -SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  tabContentContainer: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  loadingContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#EF4444',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
});
