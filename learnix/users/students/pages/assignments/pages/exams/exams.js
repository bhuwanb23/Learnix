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
import useExams from './hooks/useExams';
import ExamTabNavigation from './components/ExamTabNavigation';
import QuickStats from './components/QuickStats';
import ExamCard from './components/ExamCard';
import ExamCalendar from './components/ExamCalendar';
import PracticeOptions from './components/PracticeOptions';
import ExamResults from './components/ExamResults';
import ExamHeader from './components/ExamHeader';

export default function Exams() {
  const {
    activeTab,
    exams,
    stats,
    calendarData,
    tabs,
    selectedExam,
    isModalVisible,
    loading,
    error,
    handleTabPress,
    handleExamPress,
    handleCloseModal,
    handlePracticeExamStart,
    refreshExams,
    handleCalendarDayPress,
  } = useExams();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <ScrollView
            style={styles.content}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={refreshExams} colors={[COLORS.primary]} />
            }
          >
            <QuickStats stats={stats} />
            
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Exams</Text>
              <Text style={styles.viewAllText}>View All</Text>
            </View>
            
            <View style={styles.examsList}>
              {exams.upcoming.map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  variant="upcoming"
                  onPress={handleExamPress}
                />
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Practice Tests</Text>
              <Text style={styles.viewAllText}>View All</Text>
            </View>
            
            <View style={styles.practiceGrid}>
              {exams.practice.map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  variant="practice"
                  onPress={handleExamPress}
                />
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Results</Text>
            </View>
            
            <View style={styles.examsList}>
              {exams.completed.slice(0, 2).map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  variant="completed"
                  onPress={handleExamPress}
                />
              ))}
            </View>
          </ScrollView>
        );

      case 'schedule':
        return (
          <ScrollView style={styles.content}>
            <ExamCalendar 
              calendarData={calendarData} 
              onDayPress={handleCalendarDayPress}
            />
          </ScrollView>
        );

      case 'practice':
        return (
          <ScrollView style={styles.content}>
            <PracticeOptions 
              practiceCategories={exams.categories}
              onStartPractice={handlePracticeExamStart}
            />
          </ScrollView>
        );

      case 'results':
        return (
          <ExamResults 
            completedExams={exams.completed}
            stats={stats}
            onViewDetails={handleExamPress}
          />
        );

      default:
        return null;
    }
  };

  if (loading && !exams.upcoming.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading exams...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ExamTabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabPress={handleTabPress}
      />

      {renderTabContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F46E5',
  },
  examsList: {
    paddingHorizontal: SPACING.md,
  },
  practiceGrid: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    color: COLORS.error,
    textAlign: 'center',
  },
});
