import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useDashboardData } from '../hooks/useDashboardData';

// Import child components
import QuickActions from './QuickActions';
import ProgressOverview from './ProgressOverview';
import PendingAssignments from './PendingAssignments';
import UpcomingExams from './UpcomingExams';
import RecentCompletions from './RecentCompletions';
import NotificationsPanel from './NotificationsPanel';

// Import theme
import { COLORS, SPACING } from '../../../../../constants/theme';

export default function Dashboard({ onQuickActionPress }) {
  const {
    dashboardData,
    loading,
    error,
    handleQuickAction: handleQuickActionHook,
    handlePendingAssignmentPress,
    handleExamPress,
    handleNotificationPress,
    refresh
  } = useDashboardData();

  const handleRefresh = async () => {
    await refresh();
  };

  const handleQuickActionPress = (actionId) => {
    handleQuickActionHook(actionId);
    onQuickActionPress && onQuickActionPress(actionId);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorSubtext}>Pull to refresh</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={handleRefresh}
          colors={['#3B82F6']}
          tintColor="#3B82F6"
        />
      }
    >
      {/* Quick Actions */}
      <QuickActions 
        actions={dashboardData.quickActions}
        onActionPress={handleQuickActionPress}
      />

      {/* Progress Overview */}
      <ProgressOverview progress={dashboardData.progress} />

      {/* Pending Assignments */}
      <PendingAssignments 
        assignments={dashboardData.pendingAssignments}
        onAssignmentPress={handlePendingAssignmentPress}
      />

      {/* Upcoming Exams */}
      <UpcomingExams 
        exams={dashboardData.upcomingExams}
        onExamPress={handleExamPress}
      />

      {/* Recent Completions */}
      <RecentCompletions completions={dashboardData.recentCompletions} />

      {/* Notifications Panel */}
      <NotificationsPanel 
        notifications={dashboardData.notifications}
        onNotificationPress={handleNotificationPress}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: SPACING.lg,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  errorSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
