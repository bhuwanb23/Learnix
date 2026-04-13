import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';

// Import components
import PlacementHeader from './components/PlacementHeader';
import QuickActions from './components/QuickActions';
import ProfileStrength from './components/ProfileStrength';
import RecommendedJobs from './components/RecommendedJobs';
import UpcomingDrives from './components/UpcomingDrives';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY } from '../../../../constants/theme';

export default function PlacementPage() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Dashboard Header */}
        <PlacementHeader />

        {/* Quick Actions */}
        <QuickActions />

        {/* Profile Strength & Stats */}
        <ProfileStrength />

        {/* Recommended Jobs */}
        <RecommendedJobs />

        {/* Upcoming Drives */}
        <UpcomingDrives />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
});
