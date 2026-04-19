import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  useStudentResponsive,
  STUDENT_MAX_CONTENT_WIDTH,
} from '../../hooks/useStudentResponsive';

// Import components
import ProfileHeader from './components/ProfileHeader';
import ProfileStats from './components/ProfileStats';
import QuickActions from './components/QuickActions'; // Will become Categories & Honors
import CampusWallet from './components/CampusWallet';
import Settings from './components/Settings'; // Will become Quick Settings
import ViewProfilePage from './pages/view_profile/view_profile';
import AcademicDetailsPage from './pages/academic_details/academic_details';
import ProgressAnalyticsPage from './pages/progress_analytics/progress_analytics';
import ActivityPage from './pages/activity/activity';
import SettingsPage from './pages/settings/settings';
import MyApplicationPage from './pages/my_application/my_application';
import MyRegistrationPage from './pages/my_registration/my_registration';
import CertificationsPage from './pages/certifications/certifications';

// Import constants
import {
  PROFILE_INFO,
  PROFILE_STATS,
  CATEGORIES,
  HONORS,
  WALLET_INFO,
} from './constants/profileData';

export default function Profile({ onNavigate, currentView: parentCurrentView, studentHeader }) {
  const [localCurrentView, setLocalCurrentView] = useState('profile');
  
  // Use parent view if provided, otherwise use local state
  const currentView = parentCurrentView !== undefined ? parentCurrentView : localCurrentView;
  
  const { isDesktop, profileContentPadding, sectionGap } = useStudentResponsive();
  const contentPadding = profileContentPadding;
  const contentGap = sectionGap;

  // Handle navigation to sub-pages
  const handleNavigate = (view) => {
    if (onNavigate) {
      onNavigate(view);
    } else {
      setLocalCurrentView(view);
    }
  };

  const handleBack = () => {
    handleNavigate('profile');
  };

  // Mock navigation for child components
  const mockNavigation = {
    navigate: (screen) => {
      if (screen === 'ViewProfile') {
        handleNavigate('view_profile');
      } else if (screen === 'AcademicDetails') {
        handleNavigate('academic_details');
      } else if (screen === 'ProgressAnalytics') {
        handleNavigate('progress_analytics');
      } else if (screen === 'Activity') {
        handleNavigate('activity');
      } else if (screen === 'Settings') {
        handleNavigate('settings');
      } else if (screen === 'MyApplications') {
        handleNavigate('my_applications');
      } else if (screen === 'MyRegistration') {
        handleNavigate('my_registration');
      } else if (screen === 'Certifications') {
        handleNavigate('certifications');
      }
    },
    goBack: handleBack,
  };

  return (
    <View style={styles.container}>
      {/* Show View Profile Page */}
      {currentView === 'view_profile' ? (
        <ViewProfilePage
          navigation={mockNavigation}
          route={{ params: {} }}
        />
      ) : currentView === 'academic_details' ? (
        <AcademicDetailsPage
          navigation={mockNavigation}
          route={{ params: {} }}
        />
      ) : currentView === 'progress_analytics' ? (
        <ProgressAnalyticsPage
          navigation={mockNavigation}
          route={{ params: {} }}
        />
      ) : currentView === 'activity' ? (
        <ActivityPage
          navigation={mockNavigation}
          route={{ params: {} }}
        />
      ) : currentView === 'settings' ? (
        <SettingsPage
          navigation={mockNavigation}
          route={{ params: {} }}
        />
      ) : currentView === 'my_applications' ? (
        <MyApplicationPage
          navigation={mockNavigation}
          route={{ params: {} }}
        />
      ) : currentView === 'my_registration' ? (
        <MyRegistrationPage
          navigation={mockNavigation}
          route={{ params: {} }}
        />
      ) : currentView === 'certifications' ? (
        <CertificationsPage
          navigation={mockNavigation}
          route={{ params: {} }}
        />
      ) : (
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[
            styles.scrollContent,
            isDesktop && styles.scrollContentDesktop,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {studentHeader}
          {/* User Profile Header & Identity Hero */}
          <ProfileHeader user={PROFILE_INFO} />
          
          {/* Stats Grid (CGPA, Attendance, Credits, Rank) */}
          <ProfileStats stats={PROFILE_STATS} />
          
          {/* Main Content Area */}
          <View style={[
            styles.contentGrid, 
            { paddingHorizontal: contentPadding },
            { gap: contentGap },
            isDesktop && styles.contentGridDesktop
          ]}>
            {/* Left Column: Categories & Honors */}
            <View style={[styles.leftColumn, isDesktop && { flex: 8 }]}>
              <QuickActions categories={CATEGORIES} honors={HONORS} navigation={mockNavigation} />
            </View>

            {/* Right Column: Wallet & Settings Summary */}
            <View style={[styles.rightColumn, isDesktop && { flex: 4 }]}>
              {/* Scholar Wallet */}
              <CampusWallet walletInfo={WALLET_INFO} />
              
              {/* Quick Settings & Support */}
              <Settings />
            </View>
          </View>

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9', // bg-surface
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // pb-32
  },
  scrollContentDesktop: {
    width: '100%',
    maxWidth: STUDENT_MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  contentGrid: {
    marginTop: 32, // gap-8 spacing from stats
    flexDirection: 'column', // stack for mobile
    gap: 24, // gap-8
    maxWidth: STUDENT_MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    width: '100%',
  },
  contentGridDesktop: {
    flexDirection: 'row',
  },
  leftColumn: {
    gap: 24, // space-y-8
  },
  rightColumn: {
    gap: 24, // space-y-6
  },
});
