import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Text
} from 'react-native';
import { useSyllabusProgress } from './hooks/useSyllabusProgress';
import SyllabusHeader from './components/SyllabusHeader';
import TabNavigation from './components/TabNavigation';
import AIReminder from './components/AIReminder';
import SubjectCard from './components/SubjectCard';
import FloatingActionButton from './components/FloatingActionButton';

export default function SyllabusProgress({ navigation }) {
  const {
    // State
    activeTab,
    subjects,
    overallStats,
    aiReminders,
    loading,
    refreshing,
    
    // Data
    tabs,
    
    // Actions
    handleTabChange,
    handleChapterToggle,
    handleDismissReminder,
    handleViewReminder,
    handleRefresh,
    loadData,
    
    // Helper functions
    getProgressColor,
    getStatusColor,
    formatDate,
    calculateDaysRemaining
  } = useSyllabusProgress();

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBackPress = () => {
    console.log('Back pressed');
    if (navigation && navigation.navigate) {
      navigation.navigate('main'); // Go back to main (Classes tab)
    }
  };

  const handleNotificationPress = () => {
    console.log('Notification pressed');
    // Navigate to notifications screen
  };

  const handleAddSubject = () => {
    console.log('Add subject pressed');
    // Navigate to add subject screen
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <SyllabusHeader
        overallStats={overallStats}
        onBackPress={handleBackPress}
        onNotificationPress={handleNotificationPress}
      />

      {/* Tab Navigation */}
      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabPress={handleTabChange}
      />

      {/* AI Reminder */}
      {aiReminders.length > 0 && (
        <AIReminder
          reminder={aiReminders[0]}
          onDismiss={handleDismissReminder}
          onView={handleViewReminder}
        />
      )}

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#3B82F6"]}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Subjects List */}
        <View style={styles.subjectsList}>
          {subjects.length > 0 ? (
            subjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                onChapterToggle={handleChapterToggle}
                getProgressColor={getProgressColor}
                getStatusColor={getStatusColor}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No subjects found. Add a new subject to get started.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <FloatingActionButton onPress={handleAddSubject} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 100 // Space for floating action button
  },
  subjectsList: {
    paddingTop: 16
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24
  }
});
