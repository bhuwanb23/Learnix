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

export default function PlacementPage({ navigation }) {
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
        <QuickActions navigation={navigation} />

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
    backgroundColor: '#f5f7f9',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
});
