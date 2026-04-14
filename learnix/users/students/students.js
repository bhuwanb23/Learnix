import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import pages
import Dashboard from './pages/dashboard/dashboard';
import AssignmentPage from './pages/assignments/assignment';
import ProfilePage from './pages/profile/profile';
import EventsPage from './pages/events/events';
import ClassPage from './pages/class/class';
import PlacementPage from './pages/placement/placement';
import BrowseJobsPage from './pages/placement/pages/browse_jobs';
import PlacementDrivePage from './pages/placement/pages/placement_drive';
import JobDetailsPage from './pages/placement/pages/job_details';
import JobApplyPage from './pages/placement/pages/jobs_apply/job_apply';

// Import components
import StudentHeader from './components/StudentHeader';
import StudentBottomNavbar from './components/StudentBottomNavbar';

// Import theme
import { COLORS } from '../../constants/theme';

export default function StudentsScreen() {
  const [activeTab, setActiveTab] = useState('Home');
  const [currentScreen, setCurrentScreen] = useState('Main');
  const [screenParams, setScreenParams] = useState({});

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setCurrentScreen('Main');
    setScreenParams({});
  };

  const navigateToScreen = (screenName, params = {}) => {
    setCurrentScreen(screenName);
    setScreenParams(params);
  };

  const renderContent = () => {
    if (currentScreen === 'BrowseJobs') {
      return <BrowseJobsPage navigation={{ goBack: () => setCurrentScreen('Main'), navigate: navigateToScreen }} />;
    }
    if (currentScreen === 'PlacementDrive') {
      return <PlacementDrivePage navigation={{ goBack: () => setCurrentScreen('Main') }} />;
    }
    if (currentScreen === 'JobDetails') {
      return <JobDetailsPage navigation={{ goBack: () => setCurrentScreen('BrowseJobs') }} route={screenParams} />;
    }
    
    if (currentScreen === 'JobApply') {
      return <JobApplyPage navigation={{ goBack: () => setCurrentScreen('JobDetails') }} route={screenParams} />;
    }

    switch (activeTab) {
      case 'Home':
        return <Dashboard />;
      case 'Classes':
        return <ClassPage />;
      case 'Assignments':
        return <AssignmentPage />;
      case 'Events':
        return <EventsPage />;
      case 'Placement':
        return <PlacementPage navigation={{ navigate: navigateToScreen }} />;
      case 'Profile':
        return <ProfilePage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header - Always visible */}
      <StudentHeader activeTab={activeTab} />
      
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
