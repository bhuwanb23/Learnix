import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';
import { COLORS, SPACING } from '../../../../../../constants/theme';
import useAssignments from './hooks/useAssignments';
import AssignmentTabNavigation from './components/AssignmentTabNavigation';
import AssignmentCard from './components/AssignmentCard';
import AssignmentDetailModal from './components/AssignmentDetailModal';

export default function AssignmentSubmission() {
  const {
    assignments,
    activeTab,
    selectedAssignment,
    isModalVisible,
    loading,
    error,
    counts,
    handleTabPress,
    handleAssignmentPress,
    handleCloseModal,
    handleSubmitAssignment,
    refreshAssignments,
  } = useAssignments();

  const handleRefresh = async () => {
    await refreshAssignments();
  };

  const renderAssignmentCard = (assignment) => {
    const variant = activeTab === 'pending' ? 'default' : activeTab;
    return (
      <AssignmentCard
        key={assignment.id}
        assignment={assignment}
        variant={variant}
        onPress={handleAssignmentPress}
      />
    );
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>Loading assignments...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Error: {error}</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {activeTab === 'pending' 
          ? 'No pending assignments!' 
          : activeTab === 'submitted'
          ? 'No submitted assignments yet.'
          : 'No graded assignments yet.'
        }
      </Text>
    </View>
  );

  const renderTabContent = () => {
    if (loading && assignments.length === 0) {
      return renderLoadingState();
    }

    if (error) {
      return renderErrorState();
    }

    if (assignments.length === 0) {
      return renderEmptyState();
    }

    return (
      <View style={styles.assignmentsList}>
        {assignments.map(renderAssignmentCard)}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <AssignmentTabNavigation
        tabs={Object.keys(counts).map(tabId => ({
          id: tabId,
          title: tabId.charAt(0).toUpperCase() + tabId.slice(1),
          count: counts[tabId],
        }))}
        activeTab={activeTab}
        onTabPress={handleTabPress}
      />

      {/* Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {renderTabContent()}
      </ScrollView>

      {/* Assignment Detail Modal */}
      <AssignmentDetailModal
        visible={isModalVisible}
        assignment={selectedAssignment}
        onClose={handleCloseModal}
        onSubmit={handleSubmitAssignment}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', // bg-gray-50 equivalent
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 80, // Space for bottom navigation
  },
  assignmentsList: {
    gap: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
