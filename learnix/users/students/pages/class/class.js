import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';

// Import components
import TodayOverview from './components/TodayOverview';
import QuickActions from './components/QuickActions';
import SubjectProgress from './components/SubjectProgress';
import UpcomingTests from './components/UpcomingTests';
import PendingTopics from './components/PendingTopics';
import AIRecommendations from './components/AIRecommendations';

// Import hooks
import { useClassData } from './hooks/useClassData';
import { useClassActions } from './hooks/useClassActions';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING } from '../../../../constants/theme';

export default function ClassPage() {
  const [refreshing, setRefreshing] = useState(false);

  // Custom hooks
  const {
    todaySchedule,
    subjects,
    upcomingTests,
    pendingTopics,
    aiRecommendations,
    loading,
    error,
  } = useClassData();

  const {
    handleQuickAction,
    handleSubjectPress,
    handleTestPress,
    handleTopicStudy,
    handleAIRecommendation,
  } = useClassActions();

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading class data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading class data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Today's Overview */}
        <TodayOverview
          schedule={todaySchedule}
          onPress={() => console.log('Schedule pressed')}
        />

        {/* Quick Actions */}
        <QuickActions
          onActionPress={handleQuickAction}
        />

        {/* Subject Progress */}
        <SubjectProgress
          subjects={subjects}
          onSubjectPress={handleSubjectPress}
        />

        {/* Upcoming Tests */}
        <UpcomingTests
          tests={upcomingTests}
          onTestPress={handleTestPress}
        />

        {/* Pending Topics */}
        <PendingTopics
          topics={pendingTopics}
          onStudyPress={handleTopicStudy}
        />

        {/* AI Recommendations */}
        <AIRecommendations
          recommendations={aiRecommendations}
          onRecommendationPress={handleAIRecommendation}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: SPACING.lg,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: '#EF4444',
    textAlign: 'center',
  },
});
