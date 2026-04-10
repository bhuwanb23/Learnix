import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
} from 'react-native';

// Import components
import AcademicHeader from './components/AcademicHeader';
import TodaysOverview from './components/TodaysOverview';
import QuickActionsBento from './components/QuickActionsBento';
import CourseProgression from './components/CourseProgression';
import AIRecommendationsCard from './components/AIRecommendationsCard';
import UpcomingTestsTimeline from './components/UpcomingTestsTimeline';
import PerformanceStats from './components/PerformanceStats';
import LectureNotesContainer from './features/lecture_notes';
import WeakTopicsPage from './features/weak_topics/weak_topics';
import QuizPage from './features/quiz/quiz';

// Import data
import {
  mockClassData,
  mockQuickActions,
  mockCourses,
  mockAIRecommendations,
  mockUpcomingTests,
  mockPerformanceStats,
} from './constants/classData';

export default function ClassPage({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [currentFeature, setCurrentFeature] = useState('main'); // 'main' or 'lecture_notes'

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const navigateToFeature = (feature) => {
    setCurrentFeature(feature);
  };

  const navigateBack = () => {
    setCurrentFeature('main');
  };

  // Render Lecture Notes feature
  if (currentFeature === 'lecture_notes') {
    return (
      <LectureNotesContainer 
        navigation={navigation} 
        onBack={navigateBack}
      />
    );
  }

  // Render Weak Topics feature
  if (currentFeature === 'weak_topics') {
    return (
      <WeakTopicsPage 
        navigation={{ goBack: navigateBack }}
      />
    );
  }

  // Render Quiz feature
  if (currentFeature === 'quizzes' || currentFeature === 'quiz') {
    return (
      <QuizPage 
        navigation={{ goBack: navigateBack }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Academic Header */}
        <AcademicHeader semester={mockClassData.semester} credits={mockClassData.credits} />

        {/* Today's Overview - Glassmorphism */}
        <TodaysOverview liveClass={mockClassData.liveClass} />

        {/* Quick Actions Bento Grid */}
        <QuickActionsBento 
          actions={mockQuickActions} 
          navigation={{ navigate: navigateToFeature }} 
        />

        {/* Course Progression Cards */}
        <CourseProgression courses={mockCourses} />

        {/* AI Recommendations & Sidebar */}
        <AIRecommendationsCard data={mockAIRecommendations} />

        {/* Upcoming Tests Timeline */}
        <UpcomingTestsTimeline tests={mockUpcomingTests} />

        {/* Performance Statistics */}
        <PerformanceStats stats={mockPerformanceStats} />
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
    padding: 24,
    paddingBottom: 10, // Padding for bottom nav bar
    gap: 32, // Add gap between sections
  },
});
