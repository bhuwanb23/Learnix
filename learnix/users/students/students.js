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
import JobApplyDonePage from './pages/placement/pages/job_apply_done/job_apply_done';
import NotificationsPage from './pages/notifications/notifications';
import MentorshipPage from './pages/mentorship/mentorship';
import { setDemoUser } from '../../services/api';

// Import components
import StudentHeader from './components/StudentHeader';
import StudentBottomNavbar from './components/StudentBottomNavbar';

// Import theme
import { COLORS } from '../../constants/theme';

export default function StudentsScreen() {
  setDemoUser('student@learnix.dev');
  const [activeTab, setActiveTab] = useState('Home');
  const [currentScreen, setCurrentScreen] = useState('Main');
  const [screenParams, setScreenParams] = useState({});
  const [profileView, setProfileView] = useState('profile'); // 'profile', 'view_profile', 'academic_details', 'progress_analytics', 'activity', 'settings', 'my_applications', 'my_registration', or 'certifications'

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setCurrentScreen('Main');
    setScreenParams({});
    setProfileView('profile'); // Reset profile view when changing tabs
  };

  const navigateToScreen = (screenName, params = {}) => {
    setCurrentScreen(screenName);
    setScreenParams(params);
  };

  const handleProfilePress = () => {
    setActiveTab('Profile');
    setProfileView('profile');
  };

  const handleProfileNavigation = (view) => {
    setProfileView(view);
  };

  const renderContent = () => {
    if (currentScreen === 'Notifications') {
      return <NotificationsPage navigation={{ goBack: () => setCurrentScreen('Main') }} />;
    }
    if (currentScreen === 'Mentorship') {
      return <MentorshipPage navigation={{ goBack: () => setCurrentScreen('Main') }} />;
    }
    if (currentScreen === 'BrowseJobs') {
      return <BrowseJobsPage navigation={{ goBack: () => setCurrentScreen('Main'), navigate: navigateToScreen }} />;
    }
    if (currentScreen === 'PlacementDrive') {
      return <PlacementDrivePage navigation={{ goBack: () => setCurrentScreen('Main') }} />;
    }
    if (currentScreen === 'JobDetails') {
      return <JobDetailsPage navigation={{ 
        goBack: () => setCurrentScreen('BrowseJobs'),
        navigate: (screen, params) => {
          if (screen === 'JobApply') {
            setCurrentScreen('JobApply');
            setScreenParams(params || {});
          }
        }
      }} route={screenParams} />;
    }
    
    if (currentScreen === 'JobApply') {
      return <JobApplyPage navigation={{ 
        goBack: () => setCurrentScreen('JobDetails'),
        navigate: (screen, params) => {
          if (screen === 'JobApplyDone') {
            setCurrentScreen('JobApplyDone');
            setScreenParams(params || {});
          }
        }
      }} route={screenParams} />;
    }
    
    if (currentScreen === 'JobApplyDone') {
      return <JobApplyDonePage navigation={{ 
        goBack: () => setCurrentScreen('BrowseJobs'),
        navigate: (screen, params) => {
          if (screen === 'BrowseJobs') {
            setCurrentScreen('BrowseJobs');
            setScreenParams(params || {});
          }
        }
      }} route={screenParams} />;
    }

    switch (activeTab) {
      case 'Home':
        return <Dashboard navigation={{ navigate: (tabName) => handleTabChange(tabName), navigateToScreen }} />;
      case 'Classes':
        return <ClassPage />;
      case 'Assignments':
        return <AssignmentPage />;
      case 'Events':
        return <EventsPage />;
      case 'Placement':
        return <PlacementPage navigation={{ navigate: navigateToScreen }} />;
      case 'Profile':
        return <ProfilePage onNavigate={handleProfileNavigation} currentView={profileView} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header - Always visible */}
      <StudentHeader 
        activeTab={activeTab} 
        onProfilePress={handleProfilePress}
        onNotificationsPress={() => navigateToScreen('Notifications')}
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
