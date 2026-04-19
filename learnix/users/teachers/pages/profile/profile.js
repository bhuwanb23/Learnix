import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileHeader from './components/ProfileHeader';
import ProfileHero from './components/ProfileHero';
import StatsGrid from './components/StatsGrid';
import BiographySection from './components/BiographySection';
import AcademicHistory from './components/AcademicHistory';
import AwardsSection from './components/AwardsSection';
import SettingsPanel from './components/SettingsPanel';
import {
  PROFILE,
  STATS,
  BIO,
  ACADEMIC_HISTORY,
  AWARDS,
  SETTINGS,
  ACTIVITY,
} from './constants/profileData';

export default function TeacherProfilePage() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader profile={PROFILE} />
        <ProfileHero profile={PROFILE} />
        <StatsGrid stats={STATS} />
        <BiographySection bio={BIO} />
        <AcademicHistory history={ACADEMIC_HISTORY} />
        <AwardsSection awards={AWARDS} />
        <SettingsPanel settings={SETTINGS} activity={ACTIVITY} />
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


