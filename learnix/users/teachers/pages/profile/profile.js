import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileHeader from './components/ProfileHeader';
import ProfileHero from './components/ProfileHero';
import StatsGrid from './components/StatsGrid';
import QuickLinks from './components/QuickLinks';
import BiographySection from './components/BiographySection';
import AcademicHistory from './components/AcademicHistory';
import AwardsSection from './components/AwardsSection';
import RecentActivity from './components/RecentActivity';
import EditProfile from './pages/edit_profile/edit_profile';
import Settings from './pages/settings/settings';
import Activity from './pages/activity/activity';
import Publications from './pages/publications/publications';
import OfficeHours from './pages/office_hours/office_hours';
import {
  PROFILE,
  STATS,
  BIO,
  ACADEMIC_HISTORY,
  AWARDS,
  ACTIVITY,
} from './constants/profileData';

const QUICK_LINKS = [
  { id: 'Settings', label: 'Settings', hint: 'Prefs & account', icon: 'settings', color: '#0050d4' },
  { id: 'Activity', label: 'Activity', hint: 'Recent events', icon: 'history', color: '#702ae1' },
  { id: 'Publications', label: 'Publications', hint: 'Research works', icon: 'article', color: '#a23800' },
  { id: 'OfficeHours', label: 'Office Hours', hint: 'Availability', icon: 'schedule', color: '#16a34a' },
];

export default function TeacherProfilePage() {
  const [currentScreen, setCurrentScreen] = useState('hub');

  const handleNavigate = (screen) => {
    setCurrentScreen(screen);
  };

  const subNavigation = {
    goBack: () => handleNavigate('hub'),
    navigate: handleNavigate,
  };

  if (currentScreen === 'EditProfile') {
    return <EditProfile route={{ params: {} }} navigation={subNavigation} />;
  }

  if (currentScreen === 'Settings') {
    return <Settings route={{ params: {} }} navigation={subNavigation} />;
  }

  if (currentScreen === 'Activity') {
    return <Activity route={{ params: {} }} navigation={subNavigation} />;
  }

  if (currentScreen === 'Publications') {
    return <Publications route={{ params: {} }} navigation={subNavigation} />;
  }

  if (currentScreen === 'OfficeHours') {
    return <OfficeHours route={{ params: {} }} navigation={subNavigation} />;
  }

  const handleDownloadCV = () => {
    Alert.alert('Curriculum Vitae', 'CV download started — Eleanor_Vance_CV_2026.pdf');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          profile={PROFILE}
          onSettingsPress={() => handleNavigate('Settings')}
        />
        <ProfileHero
          profile={PROFILE}
          onDownloadCV={handleDownloadCV}
          onEditProfile={() => handleNavigate('EditProfile')}
        />
        <StatsGrid stats={STATS} />
        <QuickLinks links={QUICK_LINKS} onPress={handleNavigate} />
        <BiographySection bio={BIO} />
        <AcademicHistory history={ACADEMIC_HISTORY} />
        <AwardsSection awards={AWARDS} />
        <RecentActivity
          activities={ACTIVITY.slice(0, 3)}
          onViewAll={() => handleNavigate('Activity')}
        />
      </ScrollView>
    </SafeAreaView>
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
  content: {
    paddingBottom: 32,
  },
});