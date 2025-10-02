import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Text
} from 'react-native';

// Import components
import QuizHeader from './components/QuizHeader';
import StatsOverview from './components/StatsOverview';
import QuizQuickActions from './components/QuizQuickActions';
import SubjectsList from './components/SubjectsList';
import WeakTopics from './components/WeakTopics';
import Leaderboard from './components/Leaderboard';
import Achievements from './components/Achievements';

// Import hooks
import useQuizData from './hooks/useQuizData';
import useQuizActions from './hooks/useQuizActions';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING } from '../../../../../../constants/theme';

export default function QuizArenaPage({ navigation }) {
  const {
    loading,
    error,
    refreshing,
    userStats,
    quickActions,
    subjects,
    weakTopics,
    leaderboard,
    achievements,
    refreshData
  } = useQuizData();

  const {
    handleQuickAction,
    handleSubjectAction,
    handleWeakTopicPractice,
    handleViewAllSubjects,
    handleViewAllLeaderboard,
    handleViewAllAchievements,
    handleNotificationPress
  } = useQuizActions(navigation);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading Quiz Arena...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshData}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
      >
        <QuizHeader 
          userStats={userStats}
          onNotificationPress={handleNotificationPress}
        />
        
        <StatsOverview stats={userStats.overallStats} />
        
        <QuizQuickActions 
          actions={quickActions}
          onActionPress={handleQuickAction}
        />
        
        <SubjectsList 
          subjects={subjects}
          onSubjectAction={handleSubjectAction}
          onViewAll={handleViewAllSubjects}
        />
        
        <WeakTopics 
          topics={weakTopics}
          onTopicPress={handleWeakTopicPractice}
        />
        
        <Leaderboard 
          leaderboard={leaderboard}
          onViewAll={handleViewAllLeaderboard}
        />
        
        <Achievements 
          achievements={achievements}
          onViewAll={handleViewAllAchievements}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: SPACING.md,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: '#DC2626',
    textAlign: 'center',
  },
});
