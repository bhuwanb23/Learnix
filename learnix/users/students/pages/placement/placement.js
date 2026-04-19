import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';

// Import components
import PlacementHeader from './components/PlacementHeader';
import QuickActions from './components/QuickActions';
import ProfileStrength from './components/ProfileStrength';
import RecommendedJobs from './components/RecommendedJobs';
import UpcomingDrives from './components/UpcomingDrives';

export default function PlacementPage({ navigation, studentHeader }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;
  const horizontalPadding = isDesktop ? 28 : isTablet ? 20 : 12;

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding },
          isDesktop && styles.scrollContentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {studentHeader}
        {/* Dashboard Header */}
        <PlacementHeader />

        {/* Quick Actions */}
        <QuickActions navigation={navigation} />

        {/* Profile Strength & Stats */}
        <ProfileStrength />

        {/* Recommended Jobs */}
        <RecommendedJobs navigation={navigation} />

        {/* Upcoming Drives */}
        <UpcomingDrives navigation={navigation} />
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
    paddingBottom: 40,
  },
  scrollContentDesktop: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
  },
});
