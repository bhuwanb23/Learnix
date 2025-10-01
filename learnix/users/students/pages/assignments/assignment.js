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

// Import components
import QuickActions from './components/QuickActions';
import AssignmentCard from './components/AssignmentCard';
import UploadCard from './components/UploadCard';
import ExamCard from './components/ExamCard';

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
  const [activeTab, setActiveTab] = useState('assignments');

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

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'assignments' && styles.activeTab,
            ]}
            onPress={() => setActiveTab('assignments')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'assignments' && styles.activeTabText,
              ]}
            >
              Assignments
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'submitted' && styles.activeTab,
            ]}
            onPress={() => setActiveTab('submitted')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'submitted' && styles.activeTabText,
              ]}
            >
              Submitted
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContentContainer}>
        {activeTab === 'assignments' ? renderAssignmentsTab() : renderSubmittedTab()}
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
  tabNavigation: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: '#3B82F6',
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
