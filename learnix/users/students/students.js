import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import components
import StudentHeader from './components/StudentHeader';
import StudentBottomNavbar from './components/StudentBottomNavbar';
import Dashboard from './pages/dashboard/dashboard';
import AssignmentPage from './pages/assignments/assignment';
import ProfilePage from './pages/profile/profile';
import EventsPage from './pages/events/events';
import ClassPage from './pages/class/class';
import LectureNotesPage from './pages/class/features/lecture_notes/lecture_notes';
import QuizArenaPage from './pages/class/features/quizzes/quiz_arena';
import SubjectTrackerPage from './pages/class/features/subject_tracker/subject_tracker';
import WeakTopicsPage from './pages/class/features/weak_topics/weak_topics';

// Import theme
import { COLORS } from '../../constants/theme';

export default function StudentsScreen() {
  const [activeTab, setActiveTab] = useState('Home');
  const [currentScreen, setCurrentScreen] = useState(null);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setCurrentScreen(null); // Reset sub-screen when changing tabs
  };

  const handleNavigate = (screenName) => {
    setCurrentScreen(screenName);
  };

  const handleGoBack = () => {
    setCurrentScreen(null);
  };

  const renderContent = () => {
    // Handle sub-screens first
    if (currentScreen === 'LectureNotes') {
      return <LectureNotesPage navigation={{ goBack: handleGoBack }} />;
    }
    if (currentScreen === 'QuizArena') {
      return <QuizArenaPage navigation={{ goBack: handleGoBack }} />;
    }
    if (currentScreen === 'SubjectTracker') {
      return <SubjectTrackerPage navigation={{ goBack: handleGoBack }} />;
    }
    if (currentScreen === 'WeakTopics') {
      return <WeakTopicsPage navigation={{ goBack: handleGoBack }} />;
    }

    // Handle main tabs
    switch (activeTab) {
      case 'Home':
        return <Dashboard navigation={{ navigate: handleTabChange }} />;
      case 'Classes':
        return <ClassPage navigation={{ navigate: handleNavigate }} />;
      case 'Assignments':
        return <AssignmentPage />;
      case 'Events':
        return <EventsPage />;
      case 'Profile':
        return <ProfilePage />;
      default:
        return <Dashboard navigation={{ navigate: handleTabChange }} />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header - Always visible */}
      <StudentHeader 
        activeTab={activeTab} 
        currentScreen={currentScreen}
        onBackPress={currentScreen ? handleGoBack : null}
      />
      
      {/* Main Content */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
      
      {/* Bottom Navigation - Always visible */}
      <StudentBottomNavbar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
